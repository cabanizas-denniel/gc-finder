from flask import Flask, request, redirect, url_for

app = Flask(__name__)

@app.route('/login.py', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']
    # Add your authentication logic here
    if authenticate(email, password):
        return redirect(url_for('student_dashboard'))
    else:
        return 'Invalid credentials', 401

def authenticate(email, password):
    # Replace with your authentication logic
    return email == 'admin' and password == 'password'

@app.route('/student-dashboard.html')
def student_dashboard():
    return 'Welcome to the student dashboard!'

if __name__ == '__main__':
    app.run(debug=True)