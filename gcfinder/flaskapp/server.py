import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import base64
from io import BytesIO
import pandas as pd
from openpyxl.styles import Font, Alignment
from openpyxl.utils import get_column_letter
from datetime import datetime
import json
import requests
from PIL import Image
import numpy as np
from scipy import ndimage

# Initialize Firebase from environment variable
cred_json_str = os.environ.get('FIREBASE_CREDENTIALS_JSON')
if cred_json_str:
    cred_dict = json.loads(cred_json_str)
    cred = credentials.Certificate(cred_dict)
else:
    # Fallback to local file if environment variable is not set (for local development)
    print("WARNING: FIREBASE_CREDENTIALS_JSON environment variable not found. Falling back to local file.")
    cred = credentials.Certificate("gcfinder-database-firebase-adminsdk-fbsvc-0447799241.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Hugging Face Inference API configuration
# Use a model that's better suited for feature extraction via Inference API
HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32"
HF_API_TOKEN = os.environ.get('HUGGING_FACE_API_TOKEN')  # Set this in your environment variables

def get_local_image_embedding(image_input):
    """
    Fallback method to create simple image embeddings using basic image analysis
    when HuggingFace API is not available
    """
    try:
        # Convert to PIL Image if needed
        if isinstance(image_input, str) and image_input.startswith('data:image'):
            image_data = image_input.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes)).convert('RGB')
        elif isinstance(image_input, Image.Image):
            image = image_input
        else:
            image = Image.open(image_input).convert('RGB')
        
        # Resize to standard size for consistency
        image = image.resize((64, 64))
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Extract basic features
        features = []
        
        # 1. Color histograms (RGB)
        for channel in range(3):
            hist, _ = np.histogram(img_array[:,:,channel], bins=16, range=(0, 256))
            features.extend(hist.tolist())
        
        # 2. Average color values
        avg_colors = np.mean(img_array, axis=(0, 1))
        features.extend(avg_colors.tolist())
        
        # 3. Color variance
        var_colors = np.var(img_array, axis=(0, 1))
        features.extend(var_colors.tolist())
        
        # 4. Brightness and contrast
        gray = np.mean(img_array, axis=2)
        brightness = np.mean(gray)
        contrast = np.std(gray)
        features.extend([brightness, contrast])
        
        # 5. Edge detection (simple gradient)
        grad_x = np.gradient(gray, axis=1)
        grad_y = np.gradient(gray, axis=0)
        edge_strength = np.mean(np.sqrt(grad_x**2 + grad_y**2))
        features.append(edge_strength)
        
        # 6. Texture features (local standard deviation)
        texture = ndimage.generic_filter(gray, np.std, size=3)
        avg_texture = np.mean(texture)
        features.append(avg_texture)
        
        # Convert to numpy array and normalize
        embedding = np.array(features, dtype=np.float32)
        
        # Normalize to unit length (similar to what CLIP would do)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        print(f"Created local embedding with {len(embedding)} features")
        return embedding
        
    except Exception as e:
        print(f"Error creating local embedding: {e}")
        # Return a random embedding as last resort
        return np.random.rand(128).astype(np.float32)

def get_image_embedding_remote(image_input):
    """
    Get image embedding using HuggingFace's sentence-transformers CLIP model
    Falls back to local embedding if API is not available
    """
    try:
        # Convert image to bytes
        if isinstance(image_input, str) and image_input.startswith('data:image'):
            # Handle base64 data URL
            image_data = image_input.split(',')[1]
            image_bytes = base64.b64decode(image_data)
        elif isinstance(image_input, Image.Image):
            # Handle PIL Image
            buffer = BytesIO()
            image_input.save(buffer, format='JPEG')
            image_bytes = buffer.getvalue()
        else:
            # Handle file path or file-like object
            image = Image.open(image_input).convert('RGB')
            buffer = BytesIO()
            image.save(buffer, format='JPEG')
            image_bytes = buffer.getvalue()
        
        # First try: Use sentence-transformers CLIP model
        success = try_sentence_transformers_clip(image_bytes)
        if success is not None:
            return success
            
        # Second try: Use original CLIP model with different approach
        success = try_openai_clip_feature_extraction(image_bytes)
        if success is not None:
            return success
            
        # Third try: Use a simple image classification model and extract features
        success = try_classification_as_features(image_bytes)
        if success is not None:
            return success
        
        print("All HuggingFace API methods failed, falling back to local embedding...")
        
        # Fallback: Use local embedding
        return get_local_image_embedding(image_input)
            
    except Exception as e:
        print(f"Error in get_image_embedding_remote: {e}")
        import traceback
        traceback.print_exc()
        
        # Last resort: try local embedding
        try:
            return get_local_image_embedding(image_input)
        except:
            print("Local embedding also failed, returning random embedding")
            return np.random.rand(128).astype(np.float32)

def try_sentence_transformers_clip(image_bytes):
    """Try using sentence-transformers CLIP model"""
    try:
        headers = {}
        if HF_API_TOKEN:
            headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
        
        # For sentence-transformers, we send the image as binary data
        response = requests.post(
            HF_API_URL,
            headers=headers,
            data=image_bytes,
            timeout=30
        )
        
        print(f"Sentence-transformers CLIP Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                embedding = np.array(result)
                print(f"Successfully got sentence-transformers embedding with shape: {embedding.shape}")
                return embedding
        else:
            print(f"Sentence-transformers CLIP failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Sentence-transformers CLIP error: {e}")
        
    return None

def try_openai_clip_feature_extraction(image_bytes):
    """Try using OpenAI CLIP model for feature extraction"""
    try:
        headers = {}
        if HF_API_TOKEN:
            headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
        
        # Try sending as binary data (common for feature extraction)
        response = requests.post(
            "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32",
            headers=headers,
            data=image_bytes,
            timeout=30
        )
        
        print(f"OpenAI CLIP Feature Extraction Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                if isinstance(result[0], list):
                    embedding = np.array(result[0])
                else:
                    embedding = np.array(result)
                print(f"Successfully got OpenAI CLIP embedding with shape: {embedding.shape}")
                return embedding
        else:
            print(f"OpenAI CLIP feature extraction failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"OpenAI CLIP feature extraction error: {e}")
        
    return None

def try_classification_as_features(image_bytes):
    """Fallback: Use ResNet for classification and extract feature-like scores"""
    try:
        headers = {"Content-Type": "application/json"}
        if HF_API_TOKEN:
            headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
        
        # Convert to base64 for ResNet model
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Use a reliable image classification model
        response = requests.post(
            "https://api-inference.huggingface.co/models/microsoft/resnet-50",
            headers=headers,
            json={"inputs": image_b64},
            timeout=30
        )
        
        print(f"ResNet Classification Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                # Extract scores to use as a simple embedding
                scores = []
                for item in result:
                    if isinstance(item, dict) and 'score' in item:
                        scores.append(item['score'])
                
                if len(scores) >= 5:  # Need enough features
                    # Pad to make a reasonable embedding size
                    while len(scores) < 128:
                        scores.extend(scores[:min(len(scores), 128-len(scores))])
                    
                    embedding = np.array(scores[:128])  # Limit to 128 dimensions
                    print(f"Successfully got ResNet-based embedding with shape: {embedding.shape}")
                    return embedding
        else:
            print(f"ResNet classification failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"ResNet classification error: {e}")
        
    return None

def compute_similarity(query_embedding, database_embeddings):
    """
    Compute cosine similarity between query and database embeddings
    """
    try:
        # Normalize embeddings
        query_norm = query_embedding / np.linalg.norm(query_embedding)
        db_norms = database_embeddings / np.linalg.norm(database_embeddings, axis=1, keepdims=True)
        
        # Compute cosine similarity
        similarities = np.dot(db_norms, query_norm.T).flatten()
        return similarities
    except Exception as e:
        print(f"Error computing similarity: {e}")
        return np.array([])
    
app = Flask(__name__)
CORS(app, resources={
    r"/*": {  # Allow all routes including /search
        "origins": ["https://gc-finder.vercel.app", "https://gcfinder.pages.dev", "http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Add a simple root route for health checks and base URL access
@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "GCFinder API is running!"}), 200

@app.route('/test-api', methods=['GET'])
def test_api():
    """
    Test endpoint to check HuggingFace API connectivity and model availability
    """
    try:
        # Test with a simple 1x1 red pixel image
        test_image = Image.new('RGB', (32, 32), color='red')
        buffer = BytesIO()
        test_image.save(buffer, format='JPEG')
        image_bytes = buffer.getvalue()
        
        print("Testing HuggingFace API connectivity...")
        
        # Try each method
        results = {}
        
        # Test sentence-transformers CLIP
        result = try_sentence_transformers_clip(image_bytes)
        results['sentence_transformers_clip'] = {
            'success': result is not None,
            'shape': result.shape if result is not None else None
        }
        
        # Test OpenAI CLIP
        result = try_openai_clip_feature_extraction(image_bytes)
        results['openai_clip'] = {
            'success': result is not None,
            'shape': result.shape if result is not None else None
        }
        
        # Test ResNet fallback
        result = try_classification_as_features(image_bytes)
        results['resnet_fallback'] = {
            'success': result is not None,
            'shape': result.shape if result is not None else None
        }
        
        # Check overall status
        any_success = any(r['success'] for r in results.values())
        
        return jsonify({
            'overall_status': 'success' if any_success else 'failed',
            'hf_token_set': HF_API_TOKEN is not None,
            'detailed_results': results,
            'message': 'At least one method works' if any_success else 'All methods failed - check logs'
        })
        
    except Exception as e:
        print(f"API test error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'overall_status': 'error',
            'error': str(e)
        }), 500

@app.route('/search', methods=['POST'])
def search():
    """
    Enhanced search endpoint using remote CLIP API with improved error handling
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        print(f"Processing search request with file: {file.filename}")
        
        # Check if HF API token is available
        if not HF_API_TOKEN:
            print("WARNING: HUGGING_FACE_API_TOKEN not set. Using public API with rate limits.")
            print("Consider setting the HUGGING_FACE_API_TOKEN environment variable for better reliability.")
        else:
            print("Using authenticated HuggingFace API")
        
        # Process query image
        print("Opening and converting query image...")
        query_image = Image.open(file).convert('RGB')
        print(f"Query image size: {query_image.size}")
        
        print("Getting image embedding...")
        query_embedding = get_image_embedding_remote(query_image)
        
        if query_embedding is None:
            error_msg = (
                "Failed to process query image. This could be due to:\n"
                "1. HuggingFace API rate limits (try setting HUGGING_FACE_API_TOKEN)\n"
                "2. Model loading delays (try again in a few moments)\n"
                "3. Network connectivity issues\n"
                "4. Unsupported image format"
            )
            print(error_msg)
            return jsonify({'error': 'Failed to process query image. Please check server logs and try again later.'}), 503

        print(f"Successfully got query embedding with shape: {query_embedding.shape}")

        # Fetch and process database items
        print("Fetching items from database...")
        items_ref = db.collection('items')
        # Only fetch items that are not archived (matching frontend logic)
        items = items_ref.where('status', '!=', 'archived').stream()
        
        database_items = []
        database_embeddings = []
        processed_items = 0
        skipped_items = 0
        
        for item in items:
            item_data = item.to_dict()
            
            # Apply similar filtering logic as frontend
            # Only include items that are admin approved or have visible status
            if item_data.get('adminApproval') != True:
                skipped_items += 1
                continue
                
            # Only process items that have image data
            if 'imageData' in item_data and item_data['imageData']:
                try:
                    image_data = item_data['imageData'][0]['dataUrl']
                    embedding = get_image_embedding_remote(image_data)
                    
                    if embedding is not None:
                        database_embeddings.append(embedding.flatten())
                        database_items.append({
                            'id': item.id,
                            'name': item_data.get('name', 'Unnamed Item'),
                            'category': item_data.get('category', 'Uncategorized'),
                            'location': item_data.get('location', 'Unknown location'),
                            'date': item_data.get('date', ''),
                            'description': item_data.get('description', ''),
                            'status': item_data.get('status', 'Unclaimed'),
                            'image': image_data,
                            'submitter': item_data.get('submitter', None),
                            'adminApproval': item_data.get('adminApproval', False)
                        })
                        processed_items += 1
                    else:
                        print(f"Failed to get embedding for item {item.id}")
                        skipped_items += 1
                except Exception as e:
                    print(f"Error processing item {item.id}: {e}")
                    skipped_items += 1
                    continue
            else:
                skipped_items += 1

        print(f"Processed {processed_items} items, skipped {skipped_items} items")

        if not database_items:
            return jsonify({'error': 'No approved items with images found in database'}), 404

        # Compute and sort similarities
        print("Computing similarities...")
        database_embeddings = np.stack(database_embeddings)
        similarities = compute_similarity(query_embedding.flatten(), database_embeddings)
        
        if len(similarities) == 0:
            return jsonify({'error': 'Failed to compute similarities'}), 500
            
        results = sorted(zip(similarities, database_items), reverse=True)
        
        print(f"Returning {len(results)} results")
        return jsonify({
            'results': [
                {
                    'item': item,
                    'similarity': float(score)
                }
                for score, item in results
            ]
        })
        
    except Exception as e:
        print(f"Search error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

def fetch_items_for_export(start_date_dt=None, end_date_dt=None):
    """
    Fetches item data from Firestore for Excel export, filtered by date in Python.
    Handles various date formats stored in Firestore.
    """
    items_ref = db.collection('items')
    docs = items_ref.stream()
    data = []

    # Prepare date objects for filtering, using only the date part
    filter_start_date = start_date_dt.date() if start_date_dt else None
    filter_end_date = end_date_dt.date() if end_date_dt else None

    for doc in docs:
        item_data = doc.to_dict()
        
        doc_date_obj = None  # This will be a datetime.date object if parsing succeeds
        doc_date_raw = item_data.get('date')
        date_reported_str = 'N/A'  # For display in Excel

        if doc_date_raw:
            actual_datetime_obj = None
            if isinstance(doc_date_raw, datetime):  # Already a datetime (e.g., from Firestore Timestamp)
                actual_datetime_obj = doc_date_raw
            elif isinstance(doc_date_raw, str):
                # Try parsing various common date and datetime formats
                for fmt in (
                    '%m/%d/%Y', '%Y-%m-%d', '%d/%m/%Y', '%m-%d-%Y', '%Y/%m/%d', # Common date formats
                    '%m/%d/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%d/%m/%Y %H:%M:%S', # Common datetime formats
                    '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ', # ISO formats
                    '%a, %d %b %Y %H:%M:%S %Z' # Example: 'Mon, 12 Jul 2021 14:30:00 GMT' (RFC 822/1123) - less likely from UI
                ):
                    try:
                        actual_datetime_obj = datetime.strptime(doc_date_raw, fmt)
                        break  # Stop on first successful parse
                    except ValueError:
                        continue
            
            if actual_datetime_obj:
                doc_date_obj = actual_datetime_obj.date()  # Use date part for filtering
                date_reported_str = actual_datetime_obj.strftime('%Y-%m-%d %H:%M:%S')  # Use full datetime for display
            elif isinstance(doc_date_raw, str): # If parsing failed, keep original string for display
                date_reported_str = doc_date_raw
            else: # If some other type (e.g. number if mistake was made), convert to string for display
                date_reported_str = str(doc_date_raw)

        # Python-based date filtering
        if filter_start_date and (not doc_date_obj or doc_date_obj < filter_start_date):
            continue  # Skip item if its date is before start_date
        if filter_end_date and (not doc_date_obj or doc_date_obj > filter_end_date):
            continue  # Skip item if its date is after end_date

        # Handle potentially nested submitter information
        submitter_map = item_data.get('submitter') # Get the 'submitter' object/map
        
        submitter_user_id = None
        full_name = 'N/A'
        student_id = 'N/A'

        if isinstance(submitter_map, dict):
            # Try to get userId and denormalized details directly from the submitter_map
            submitter_user_id = submitter_map.get('userId') # Assumes userId is within the submitter map
            full_name = submitter_map.get('displayName', submitter_map.get('full_name', 'N/A'))
            student_id = submitter_map.get('studentId', submitter_map.get('student_id', 'N/A'))
        else:
            submitter_user_id = item_data.get('userId', item_data.get('submitter')) 

        if submitter_user_id and isinstance(submitter_user_id, str) and submitter_user_id != 'N/A':
            if full_name == 'N/A' or student_id == 'N/A': 
                try:
                    user_doc_ref = db.collection('users').document(submitter_user_id)
                    user_doc = user_doc_ref.get()
                    if user_doc.exists:
                        user_details = user_doc.to_dict()
                        # Override with fetched data if it was N/A from submitter_map
                        if full_name == 'N/A':
                            full_name = user_details.get('displayName', user_details.get('name', 'N/A'))
                        if student_id == 'N/A':
                            student_id = user_details.get('studentId', user_details.get('studentID', 'N/A'))
                    else:
                        print(f"User document not found for ID: {submitter_user_id} (item {doc.id})")
                except Exception as e:
                    print(f"Error fetching user details for {submitter_user_id} (item {doc.id}): {e}")
        elif submitter_user_id: # Catches cases where submitter_user_id might be non-string after initial direct get if not map
             print(f"Invalid or non-string submitter_user_id found: {submitter_user_id} for item {doc.id}")

        data.append({
            'Item_ID': doc.id,
            'Item_Name': item_data.get('name', 'N/A'),
            'Category': item_data.get('category', 'N/A'),
            'Location_Found': item_data.get('location', 'N/A'),
            'Submitted_At': date_reported_str, 
            'Status': item_data.get('status', 'N/A'),
            'Description': item_data.get('description', 'N/A'),
            'Student_ID': student_id, 
            'Full_Name': full_name,    
            'Admin_Approved': item_data.get('adminApproval', False)
        })
    
    if not data:
        return pd.DataFrame(columns=['Item_ID', 'Item_Name', 'Category', 'Location_Found', 'Submitted_At', 'Status', 'Description', 'Submitter', 'Full_Name', 'Admin_Approved'])
    return pd.DataFrame(data)

def fetch_users_for_export(start_date_dt=None, end_date_dt=None):
    """
    Fetches user data from Firestore for Excel export.
    Date filtering is currently disabled as 'students' documents lack a date field.
    """

    users_ref = db.collection('students') 
    query = users_ref
        
    docs = query.stream()
    data = []
    for doc in docs:
        user = doc.to_dict()
        user_data_for_df = {
            'User_ID': doc.id,
            'Name': user.get('full_name', user.get('name', 'N/A')), 
            'Email': user.get('email', 'N/A'),
            'Student_ID': user.get('student_id', 'N/A'),
            'Year_Level': user.get('year_level', 'N/A'),
            'Status': user.get('status', 'active')
        }
        data.append(user_data_for_df)
        
    # Define column order for the DataFrame
    df_columns = ['User_ID', 'Name', 'Email', 'Student_ID', 'Year_Level', 'Status']
    
    if not data:
        return pd.DataFrame(columns=df_columns)
    return pd.DataFrame(data, columns=df_columns)

def generate_excel_report_to_buffer(data_type, start_date_str=None, end_date_str=None):
    start_date_dt = None
    end_date_dt = None
    if start_date_str:
        try:
            start_date_dt = datetime.strptime(start_date_str, '%Y-%m-%d')
        except ValueError:
            # Allow 'None' or empty string to pass through as no date filter
            if start_date_str.lower() != 'none' and start_date_str != '':
                raise ValueError(f"Invalid start_date format: {start_date_str}. Expected YYYY-MM-DD.")
    if end_date_str:
        try:
            end_date_dt = datetime.strptime(end_date_str, '%Y-%m-%d')
        except ValueError:
            if end_date_str.lower() != 'none' and end_date_str != '':
                raise ValueError(f"Invalid end_date format: {end_date_str}. Expected YYYY-MM-DD.")

    if data_type == 'items':
        df = fetch_items_for_export(start_date_dt, end_date_dt)
        main_sheet_name = 'Items Report'
        title = 'GC Finder: Items Report'
        summary_field = 'Status' 
        summary_title = 'Item Status Summary'
    elif data_type == 'users':
        df = fetch_users_for_export(start_date_dt, end_date_dt) # Dates are now effectively ignored by fetch_users_for_export
        main_sheet_name = 'Users Report'
        title = 'GC Finder: Users Report'
        summary_field = 'Status' 
        summary_title = 'User Status Summary'
    else:
        return None

    if df.empty:
        output_buffer = BytesIO()
        empty_df_message = pd.DataFrame([{'message': f'No {data_type} found for the selected criteria.'}])
        with pd.ExcelWriter(output_buffer, engine='openpyxl') as writer:
            empty_df_message.to_excel(writer, sheet_name='No Data', index=False)
        output_buffer.seek(0)
        return output_buffer
        
    output_buffer = BytesIO()
    with pd.ExcelWriter(output_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name=main_sheet_name, index=False, startrow=1)
        
        workbook = writer.book
        worksheet = writer.sheets[main_sheet_name]
        
        worksheet['A1'] = title
        last_col_letter = get_column_letter(len(df.columns) if not df.empty else 1)
        worksheet.merge_cells(f'A1:{last_col_letter}1')
        title_cell = worksheet['A1']
        title_cell.font = Font(size=14, bold=True, name='Calibri')
        title_cell.alignment = Alignment(horizontal='center')
        
        for col_idx, column_title in enumerate(df.columns):
            cell = worksheet.cell(row=2, column=col_idx + 1)
            cell.value = column_title
            cell.font = Font(bold=True, name='Calibri')
            cell.alignment = Alignment(horizontal='center')

        status_col_name = summary_field
        if not df.empty and status_col_name in df.columns and not df[status_col_name].dropna().empty:
            status_summary_df = df[status_col_name].value_counts().reset_index()
            status_summary_df.columns = [status_col_name, 'Count']
            
            summary_sheet_name = summary_title
            status_summary_df.to_excel(writer, sheet_name=summary_sheet_name, index=False, startrow=1)
            
            summary_ws = writer.sheets[summary_sheet_name]
            summary_ws['A1'] = f"{main_sheet_name} - {summary_title}"
            summary_ws.merge_cells('A1:B1')
            summary_ws['A1'].font = Font(size=14, bold=True, name='Calibri')
            summary_ws['A1'].alignment = Alignment(horizontal='center')

            summary_ws.cell(row=2, column=1).value = status_col_name
            summary_ws.cell(row=2, column=1).font = Font(bold=True, name='Calibri')
            summary_ws.cell(row=2, column=1).alignment = Alignment(horizontal='center')
            summary_ws.cell(row=2, column=2).value = 'Count'
            summary_ws.cell(row=2, column=2).font = Font(bold=True, name='Calibri')
            summary_ws.cell(row=2, column=2).alignment = Alignment(horizontal='center')

        for sheetname_iter in writer.sheets:
            current_sheet = writer.sheets[sheetname_iter]
            for col_idx_iter, column_obj in enumerate(current_sheet.columns):
                max_cell_length = 0
                column_letter_val = get_column_letter(col_idx_iter + 1)
                
                header_cell_val = current_sheet.cell(row=1, column=col_idx_iter + 1) # Title row
                if header_cell_val.value and len(str(header_cell_val.value)) > max_cell_length:
                     max_cell_length = len(str(header_cell_val.value))
                
                header_cell_val_2 = current_sheet.cell(row=2, column=col_idx_iter + 1) # Header row
                if header_cell_val_2.value and len(str(header_cell_val_2.value)) > max_cell_length:
                     max_cell_length = len(str(header_cell_val_2.value))

                for cell_obj in column_obj:
                    if cell_obj.value:
                        cell_len_val = len(str(cell_obj.value))
                        if cell_len_val > max_cell_length:
                            max_cell_length = cell_len_val
                current_sheet.column_dimensions[column_letter_val].width = max_cell_length + 3 if max_cell_length > 0 else 12
    
    output_buffer.seek(0)
    return output_buffer

@app.route('/api/export', methods=['GET'])
def export_data_route():
    data_type = request.args.get('type')
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')

    if not data_type:
        return jsonify({"error": "Missing 'type' parameter (should be 'items' or 'users')"}), 400
    if data_type not in ['items', 'users']:
        return jsonify({"error": "Invalid 'type' parameter (should be 'items' or 'users')"}), 400

    try:
        excel_buffer = generate_excel_report_to_buffer(
            data_type=data_type, 
            start_date_str=start_date_str, 
            end_date_str=end_date_str
        )
        
        filename_prefix = data_type
        date_range_str = "all_time"
        if start_date_str and end_date_str:
            date_range_str = f"{start_date_str}_to_{end_date_str}"
        elif start_date_str:
            date_range_str = f"from_{start_date_str}"
        elif end_date_str:
            date_range_str = f"up_to_{end_date_str}"
        
        output_filename = f"GCFinder_{filename_prefix}_report_{date_range_str}.xlsx"
        
        return send_file(
            excel_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=output_filename 
        )
    except ValueError as ve:
        app.logger.error(f"ValueError during report generation: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        app.logger.error(f"Unexpected error during report generation: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred. Please check server logs."}), 500

if __name__ == '__main__':
    app.run(debug=True)
