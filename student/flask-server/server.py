import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore
import base64
from io import BytesIO

# Initialize Firebase
cred = credentials.Certificate("gcfinder-database-firebase-adminsdk-fbsvc-0447799241.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

app = Flask(__name__)
CORS(app)

# Initialize CLIP
device = "cuda" if torch.cuda.is_available() else "cpu"
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def get_image_embedding(image_input):
    if isinstance(image_input, str) and image_input.startswith('data:image'):
        image_data = image_input.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
    elif isinstance(image_input, Image.Image):
        image = image_input
    else:
        image = Image.open(image_input).convert('RGB')
    
    inputs = processor(images=image, return_tensors="pt", padding=True)
    image_features = model.get_image_features(**{k: v.to(device) for k, v in inputs.items()})
    return image_features.cpu().detach().numpy()

def compute_similarity(query_embedding, database_embeddings):
    query_embedding = query_embedding / np.linalg.norm(query_embedding)
    database_embeddings = database_embeddings / np.linalg.norm(database_embeddings, axis=1, keepdims=True)
    return np.dot(database_embeddings, query_embedding.T).flatten()

@app.route('/search', methods=['POST'])
def search():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Process query image
        query_image = Image.open(file).convert('RGB')
        query_embedding = get_image_embedding(query_image)

        # Fetch and process database items
        items_ref = db.collection('items')
        items = items_ref.stream()
        
        database_items = []
        database_embeddings = []
        
        for item in items:
            item_data = item.to_dict()
            if 'imageData' in item_data and item_data['imageData']:
                try:
                    image_data = item_data['imageData'][0]['dataUrl']
                    embedding = get_image_embedding(image_data)
                    database_embeddings.append(embedding.flatten())
                    database_items.append({
                        'id': item.id,
                        'name': item_data.get('name', 'Unnamed Item'),
                        'category': item_data.get('category', 'Uncategorized'),
                        'location': item_data.get('location', 'Unknown location'),
                        'date': item_data.get('date', ''),
                        'description': item_data.get('description', ''),
                        'status': item_data.get('status', 'Available'),
                        'adminApproval': item_data.get('adminApproval', False),
                        'image': image_data,
                        'submitter': item_data.get('submitter', None)
                    })
                except Exception as e:
                    continue

        if not database_items:
            return jsonify({'error': 'No items with images found in database'}), 404

        # Compute and sort similarities
        database_embeddings = np.stack(database_embeddings)
        similarities = compute_similarity(query_embedding.flatten(), database_embeddings)
        results = sorted(zip(similarities, database_items), reverse=True)
        
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
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
