const express = require('express');
const axios = require('axios');
require('dotenv').config();
const mongoose = require('mongoose');
const FormResponse = require('./models/formResponse');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

function sendResponseEmail(email, name, characterScores) {
    const formResultLink =
        'https://medium.com/the-coffeelicious/are-you-a-looker-a-listener-a-talker-or-a-toucher-bdb785c0dbfe';

    const mailOptions = {
        from: process.env.USER_EMAIL,
        to: email,
        subject: 'Your Form Results',
        html: `
      <html>
      
      <head>
          <title>Your Form Result</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
              }
      
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #ffffff;
                  border-radius: 5px;
                  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
              }
      
              .header {
                  background-color: #333;
                  color: white;
                  text-align: center;
                  padding: 20px;
                  border-radius: 5px 5px 0 0;
              }
      
              .content {
                  padding: 20px;
              }
      
              h1 {
                  margin: 0;
                  font-size: 24px;
                  text-align: center;
              }
      
              p {
                  font-size: 16px;
                  line-height: 1.6;
                  margin: 10px 0;
              }
      
              ul {
                  list-style: none;
                  padding: 0;
              }
      
              li {
                  margin-bottom: 10px;
              }
      
              li strong {
                  font-weight: bold;
                  margin-right: 10px;
              }
      
              a {
                  color: #0077cc;
                  text-decoration: none;
              }
      
              a:hover {
                  text-decoration: underline;
              }
          </style>
      </head>
      
      <body>
          <div class="container">
              <div class="header">
                  <h1>Your Form Result</h1>
              </div>
              <div class="content">
                  <p>Hi ${name},</p>
                  <p>You are:</p>
                  <ul>
                      <li><strong>Looker:</strong> ${characterScores.looker}%</li>
                      <li><strong>Listener:</strong> ${characterScores.listener}%</li>
                      <li><strong>Talker:</strong> ${characterScores.talker}%</li>
                      <li><strong>Toucher:</strong> ${characterScores.toucher}%</li>
                  </ul>
                  <p>For more information, you can read the article on <a href="${formResultLink}">Medium</a>.</p>
              </div>
          </div>
      </body>
      
      </html>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASS,
    },
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

app.use(express.json());

app.get('/trigger', async (req, res) => {
    const response = await axios.get(process.env.SHEET_API);
    const responseData = response.data;

    for (let row of responseData) {
        const email = row['Email address'];

        const existingResponse = await FormResponse.findOne({ email });

        if (existingResponse) {
            console.log(`Response for ${email} already exists. Skipping.`);
            continue;
        }

        const name = row['Your Full Name:'];

        const answerMap = {
            A: 'looker',
            B: 'listener',
            C: 'talker',
            D: 'toucher',
        };

        const characterScores = {
            looker: 0,
            listener: 0,
            talker: 0,
            toucher: 0,
        };

        for (const key in row) {
            if (key.includes('First priority')) {
                characterScores[answerMap[row[key]]] += 5;
            } else if (key.includes('Second priority')) {
                characterScores[answerMap[row[key]]] += 3.75;
            } else if (key.includes('Third priority')) {
                characterScores[answerMap[row[key]]] += 2.5;
            } else if (key.includes('Fourth priority')) {
                characterScores[answerMap[row[key]]] += 1.25;
            }
        }

        // const outputString = `Hi ${name}, You are ${characterScores['A']}% Looker, ${characterScores['B']}% Listener, ${characterScores['C']}% Talker, and ${characterScores['D']}% Toucher.`;

        // console.log(email, outputString);

        const formResponse = new FormResponse({
            name: name,
            email: email,
            characterScores: characterScores,
        });

        sendResponseEmail(email, name, characterScores);

        formResponse
            .save()
            .then(() => {
                console.log(`Saved response for ${email}`);
            })
            .catch((err) => {
                console.error(`Error saving response for ${email}:`, err);
            });
    }

    res.status(200).send('Triggered successfully!');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/entries', async (req, res) => {
    try {
        const entries = await FormResponse.find({});
        res.render('entries', { entries });
    } catch (err) {
        console.error('Error fetching entries:', err);
        res.status(500).send('Error fetching entries');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
