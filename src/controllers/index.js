const express = require('express');
const router = express.Router();

// Example controller function
const getExample = (req, res) => {
    res.send('This is an example response from the controller.');
};

// Define routes and associate them with controller functions
router.get('/example', getExample);

// Export the router
module.exports = router;