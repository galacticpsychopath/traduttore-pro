from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
from datetime import date  # used to save the date when a request is submitted
import smtplib  # used to send emails via gmail
from email.mime.text import MIMEText  # used to format the email

# reads your .env file first
load_dotenv()

# create the flask app — this is the core of everything
app = Flask(__name__)

# allow cross-origin requests so our frontend can communicate with this backend
CORS(app)

# go grab the secret key from .env and store it in flask settings
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')

# activate the JWT system and connect it to our app using that key
jwt = JWTManager(app)

# grab admin credentials from .env so they stay safe
admin_username = os.environ.get('ADMIN_USERNAME')
admin_password = os.environ.get('ADMIN_PASSWORD')
# grab gmail credentials from .env so they stay safe
gmail_user     = os.environ.get('GMAIL_USER')
gmail_password = os.environ.get('GMAIL_PASSWORD')

# admin login route — checks credentials and returns a JWT token
@app.route('/api/login', methods=['POST'])
def login():
    # get the data sent from the login form
    data = request.get_json()
    # extract username and password from that data
    username = data.get('username')
    password = data.get('password')
    # check if credentials match what we have in .env
    if username == admin_username and password == admin_password:
        # correct — create and return a JWT token
        access_token = create_access_token(identity=username)
        return jsonify(access_token=access_token), 200
    # wrong credentials — return error
    return jsonify(msg='wrong username or password !!!'), 401

# route for the homepage — renders the homepage html template
@app.route('/homepage')
def homepage():
    return render_template('homepage.html')

# route for the admin page — renders the admin html template
@app.route('/admin')
def admin():
    return render_template('admin.html')

# route to receive a new translation request from the homepage form
# saves it to database.json with status pending
@app.route('/api/request', methods=['POST'])
def submit_request():
    # get the data sent from the form
    data = request.get_json()
    # read the database file
    with open('database.json', 'r') as f:
        db = json.load(f)
    # create a new request object with all the form data
    new_request = {
        'id': len(db['requests']) + 1,
        'name': data.get('name'),
        'email': data.get('email'),
        'phone': data.get('phone'),
        'project_type': data.get('project_type'),
        'language_pair': data.get('language_pair'),
        'message': data.get('message'),
        'status': 'pending',
        'meeting_date': None,
        'created_at': str(date.today())
    }
    # add it to the list and save back to the file
    db['requests'].append(new_request)
    with open('database.json', 'w') as f:
        json.dump(db, f, indent=4)
    return jsonify(msg='Request submitted successfully'), 201
# route to get all requests — only admin can access this using JWT token
# route to approve a request — updates status, saves meeting date, sends email to client
@app.route('/api/requests/<int:id>/approve', methods=['POST'])
@jwt_required()  # only admin can approve
def approve_request(id):
    data = request.get_json()
    meeting_date = data.get('meeting_date')

    # read the database file
    with open('database.json', 'r') as f:
        db = json.load(f)

    # find the request by id
    req = next((r for r in db['requests'] if r['id'] == id), None)

    # if request not found return error
    if not req:
        return jsonify(msg='Request not found'), 404

    # update status and save meeting date
    req['status']       = 'approved'
    req['meeting_date'] = meeting_date

    # save updated database
    with open('database.json', 'w') as f:
        json.dump(db, f, indent=4)

    # send confirmation email to the client
    try:
        # write the email content
        email_body = f"""
Dear {req['name']},

Your translation request has been approved.

Meeting Date: {meeting_date}
Translation Type: {req['language_pair']}
Project Type: {req['project_type']}

Please come to our office on the scheduled date with your original documents.

Best regards,
Traduttore Pro
        """
        # build the email message
        msg = MIMEText(email_body)
        msg['Subject'] = 'Your Translation Request Has Been Approved — Traduttore Pro'
        msg['From']    = gmail_user
        msg['To']      = req['email']

        # connect to gmail and send
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, req['email'], msg.as_string())

    except Exception as e:
        # if email fails, still return success — request was saved
        print(f'Email error: {e}')

    return jsonify(msg='Request approved and email sent'), 200

@app.route('/api/requests', methods=['GET'])
@jwt_required()  # this protects the route — no token = no access
def get_requests():
    # read the database file
    with open('database.json', 'r') as f:
        db = json.load(f)
    # return all requests to the admin dashboard
    return jsonify(requests=db['requests']), 200

# run the app in debug mode — shows errors clearly during development
if __name__ == '__main__':
    app.run(debug=True)