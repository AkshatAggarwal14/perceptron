const mongoose = require('mongoose');

const formResponseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    characterScores: {
        looker: Number,
        listener: Number,
        talker: Number,
        toucher: Number,
    },
});

const FormResponse = mongoose.model('FormResponse', formResponseSchema);

module.exports = FormResponse;
