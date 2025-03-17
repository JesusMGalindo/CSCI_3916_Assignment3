const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

// Removed getJSONObjectForMovieRequirement as it's not used

router.post('/signup', async (req, res) => { // Use async/await
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: 'Please include both username and password to signup.' }); // 400 Bad Request
  }

  try {
    const user = new User({ // Create user directly with the data
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    await user.save(); // Use await with user.save()

    res.status(201).json({ success: true, msg: 'Successfully created new user.' }); // 201 Created
  } catch (err) {
    if (err.code === 11000) { // Strict equality check (===)
      return res.status(409).json({ success: false, message: 'A user with that username already exists.' }); // 409 Conflict
    } else {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    }
  }
});


router.post('/signin', async (req, res) => { // Use async/await
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Authentication failed. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await user.comparePassword(req.body.password); // Use await

    if (isMatch) {
      const userToken = { id: user._id, username: user.username }; // Use user._id (standard Mongoose)
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' }); // Add expiry to the token (e.g., 1 hour)
      res.json({ success: true, token: 'JWT ' + token });
    } else {
      res.status(401).json({ success: false, msg: 'Authentication failed. Incorrect password.' }); // 401 Unauthorized
    }
  } catch (err) {
    console.error(err); // Log the error
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
  }
});

router.route('/movies')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movies = await Movie.find({});
      return res.status(200).json(movies);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error fetching movies.' });
    }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    const { title, releaseDate, genre, actors } = req.body;

    // Basic validation
    if (!title || !releaseDate || !genre || !actors) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    // If your assignment requires at least 3 actors, for example:
    if (!Array.isArray(actors) || actors.length < 3) {
      return res.status(400).json({ success: false, message: 'Must include at least three actors.' });
    }

    try {
      const newMovie = new Movie({ title, releaseDate, genre, actors });
      const savedMovie = await newMovie.save();
      return res.status(201).json({
        success: true,
        message: 'Movie created',
        movie: savedMovie
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error creating movie.' });
    }
  });



    router.route('/movies/:title')
    // GET: Return a single movie by title
    .get(authJwtController.isAuthenticated, async (req, res) => {
      try {
        const movie = await Movie.findOne({ title: req.params.title });
        if (!movie) {
          return res.status(404).json({ success: false, message: 'Movie not found.' });
        }
        return res.status(200).json(movie);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error fetching movie.' });
      }
    })
  
    // PUT: Update a movie by title
    .put(authJwtController.isAuthenticated, async (req, res) => {
      try {
        // { new: true } returns the updated doc, runValidators enforces schema constraints
        const updatedMovie = await Movie.findOneAndUpdate(
          { title: req.params.title },
          req.body,
          { new: true, runValidators: true }
        );
  
        if (!updatedMovie) {
          return res.status(404).json({ success: false, message: 'Movie not found.' });
        }
  
        return res.status(200).json({
          success: true,
          message: 'Movie updated',
          movie: updatedMovie
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error updating movie.' });
      }
    })
  
    // DELETE: Delete a movie by title
    .delete(authJwtController.isAuthenticated, async (req, res) => {
      try {
        const deletedMovie = await Movie.findOneAndDelete({ title: req.params.title });
        if (!deletedMovie) {
          return res.status(404).json({ success: false, message: 'Movie not found.' });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Movie deleted.'
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error deleting movie.' });
      }
    });  

app.use('/', router);

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only