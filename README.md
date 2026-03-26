# ShrinkMe

ShrinkMe is an AI-assisted mental wellness journaling web application that helps users record daily moods and thoughts, visualize emotional trends, and generate monthly mental health reports. The system uses sentiment analysis to identify patterns in journal entries and provide supportive suggestions, including therapist recommendations when repeated distress is detected. The project is designed to promote self-awareness, emotional tracking, and early mental health support.

## Live Links

- Live Website: [https://shrinkmeee.netlify.app/](https://shrinkmeee.netlify.app/)
- Backend API: [https://shrinkme-backend.onrender.com](https://shrinkme-backend.onrender.com)

## Features

- Daily mood and journal entry tracking
- Persistent data storage using MongoDB Atlas
- Monthly mood analytics with charts
- Sentiment-based mental health report generation
- Supportive suggestions based on emotional trends
- Therapist recommendation when repeated distress patterns are detected
- Delete saved journal entries
- Fully deployed frontend and backend

## Tech Stack

1. Frontend
- HTML5
- CSS3
- JavaScript
- Chart.js

2. Backend
- Node.js
- Express.js

3. Database
- MongoDB Atlas
- Mongoose

4. AI / NLP
- Sentiment analysis based report generation

5. Deployment
- Netlify
- Render

## Project Structure


ShrinkMe_mh_tracker/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── index.html
├── script.js
├── styles.css
└── .gitignore

Installation and Setup
1. Clone the repository
git clone https://github.com/nns0212/ShrinkMe_mh_tracker.git
cd ShrinkMe_mh_tracker
2. Install backend dependencies
cd backend
npm install
3. Configure environment variables
Create a .env file inside the backend folder and add:
[MONGO_URI=your_mongodb_connection_string
PORT=5000]

## To Run Locally
1. Start backend
2. cd backend
3. node server.js
4. Start frontend
5. Open index.html using Live Server in VS Code or open it in a browser after backend is running.

## How It Works
1.Users select their mood and write a journal entry.
2. Entries are stored in MongoDB Atlas.
3. The dashboard displays saved entries and mood graphs.
4. Monthly reports analyze journal sentiment and mood trends.
5. The system provides suggestions and flags concerning emotional patterns.
