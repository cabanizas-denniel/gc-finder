# Batch Add Students API Implementation

This document describes how to implement the backend API endpoint for batch adding students.

## API Endpoint

### POST `/api/students/batch-create`

Creates multiple student accounts in batch.

#### Request Body
```json
{
  "students": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "generated_password_123",
      "status": "active",
      "role": "student",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "Jane Smith", 
      "email": "jane@example.com",
      "password": "another_password_456",
      "status": "active",
      "role": "student",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "message": "Successfully created 2 students",
  "created_count": 2,
  "students": [
    {
      "id": "student_id_1",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "active",
      "role": "student",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "student_id_2", 
      "name": "Jane Smith",
      "email": "jane@example.com",
      "status": "active",
      "role": "student",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Example Implementation (Node.js/Express with Firebase)

```javascript
// routes/students.js
const express = require('express');
const { admin } = require('../config/firebase');
const bcrypt = require('bcrypt');
const router = express.Router();

router.post('/batch-create', async (req, res) => {
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid students data provided'
      });
    }

    const batch = admin.firestore().batch();
    const createdStudents = [];
    
    for (const student of students) {
      // Validate required fields
      if (!student.name || !student.email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required for all students'
        });
      }

      // Check if email already exists
      const existingUser = await admin.firestore()
        .collection('users')
        .where('email', '==', student.email)
        .get();
        
      if (!existingUser.empty) {
        return res.status(400).json({
          success: false,
          message: `Email ${student.email} already exists`
        });
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: student.email,
        password: student.password,
        displayName: student.name
      });

      // Hash password for database storage
      const hashedPassword = await bcrypt.hash(student.password, 10);

      // Prepare Firestore document
      const userDoc = admin.firestore().collection('users').doc(userRecord.uid);
      const userData = {
        id: userRecord.uid,
        name: student.name,
        email: student.email,
        password: hashedPassword,
        status: 'active',
        role: 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(userDoc, userData);
      createdStudents.push({
        id: userRecord.uid,
        name: student.name,
        email: student.email,
        status: 'active',
        role: 'student',
        createdAt: new Date().toISOString()
      });
    }

    // Commit batch write
    await batch.commit();

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdStudents.length} students`,
      created_count: createdStudents.length,
      students: createdStudents
    });

  } catch (error) {
    console.error('Batch create students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create students: ' + error.message
    });
  }
});

module.exports = router;
```

## CSV Format

The frontend accepts CSV data in the following format:
```
Name, Email, Password (optional)
John Doe, john@example.com
Jane Smith, jane@example.com, mypassword123
Bob Johnson, bob@school.edu
```

- **Name**: Required - Student's full name
- **Email**: Required - Student's email address (must be unique)
- **Password**: Optional - If not provided, a random password will be generated

## Features

1. **Manual Entry**: Admin can type student data directly in CSV format
2. **File Upload**: Admin can upload a CSV file with student data
3. **Password Generation**: Automatic random password generation for students without passwords
4. **Validation**: Email uniqueness checking and required field validation
5. **Batch Processing**: Efficient creation of multiple students in a single operation
6. **Error Handling**: Comprehensive error messages for various failure scenarios

## Security Considerations

1. **Password Hashing**: All passwords should be hashed before storage
2. **Email Validation**: Validate email format and check for duplicates
3. **Input Sanitization**: Sanitize all input data to prevent injection attacks
4. **Authentication**: Ensure only authorized admins can access this endpoint
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Usage Instructions

1. Click the "Batch Add Students" button in the User Management interface
2. Choose between "Manual Entry" or "CSV Upload"
3. For Manual Entry: Type student data in CSV format in the textarea
4. For CSV Upload: Click "Choose File" and select a CSV file
5. Review the data in the preview area
6. Click "Add Students" to create the accounts
7. Students will receive email notifications with their login credentials 