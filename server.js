const dotenv = require('dotenv');
dotenv.config();
const routes = require('./routes/index');
const express = require('express');

const port = process.env.PORT || 5000;

const db = require('./config/db');
const bodyParser = require('body-parser');
const app = express();
db();

app.use(express.json());

app.use(bodyParser.urlencoded({extended: true}));

app.use('/api', routes);

app.listen(port, (err) => {
    if(!err) {
        console.log(`server port started on http://localhost:${port}`);
    }
})
