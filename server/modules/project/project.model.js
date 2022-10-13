const Promise = require('bluebird');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const APIError = require('@server/helpers/APIError');

/**
 * Safe Schema
 */
const ProjectSchema = new mongoose.Schema({
    name: { type: String },
    description: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    links: {
        type: Array,
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Project', ProjectSchema);
