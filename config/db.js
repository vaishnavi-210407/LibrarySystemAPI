const mongoose = require('mongoose');

const database = async () => {
    try {
        await mongoose.connect(process.env.MODE == 'production' ? process.env.PRD.DB.URL : process.env.DEV_DB_URL);
        console.log('database connected');
    } catch (error) {
        console.log('database not connected');
    }

}

module.exports = database;