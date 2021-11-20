module.exports = function (app, passport, db, multer, ObjectId) {
	// Image Upload Code =========================================================================
	var storage = multer.diskStorage({
		destination: (req, file, cb) => {
			cb(null, 'public/images/uploads');
		},
		filename: (req, file, cb) => {
			cb(null, file.fieldname + '-' + Date.now() + '.png');
		},
	});
	var upload = multer({ storage: storage });

	// normal routes ===============================================================
 // data ID targets each post (data attribute) - main (fetch) - routes (to the put)
	// show the home page (will also have our login links)

// this is the main page
	app.get('/', function (req, res) {
		res.render('index.ejs');
	});

	// PROFILE SECTION =========================
	app.get('/profile', isLoggedIn, function (req, res) {
		db.collection('posts')
		//this is finding the post that this user has made
			.find({ postedBy: req.user._id })
			.toArray((err, result) => {
				if (err) return console.log(err);
				res.render('profile.ejs', {
					user: req.user,
					posts: result,
				});
			});
	});

	//feed page
	// this is where we load up the feed page
	app.get('/feed', function (req, res) {
		db.collection('posts')
			.find()
			.toArray((err, result) => {
				if (err) return console.log(err);
				// this is where we parse through the post collection and return the documents
				res.render('feed.ejs', {
					posts: result,
				});
			});
	});

	// this is where we add a search filter 
	app.get('/search', (req, res) => {
		db.collection('posts')
		// this is where we find the documents in the collection post that meet the search query
			.find({"caption" : {$regex : req.query.search, $options:"i"}})
			.toArray((err, result) => {
				if (err) return console.log(err);
				res.render('feed.ejs', { posts: result });
			});
	});
	
	// we are the information that is already in the db. 
	app.get('/post/:singlePost', isLoggedIn, function (req, res) {
		console.log('params', req.params);
		let postId = ObjectId(req.params.singlePost);
		console.log('objectId', postId);
		db.collection('posts')
			.find({
				_id: postId,
			})
			//we are converting the information to a new array called result using the  toArray method 
			.toArray((err, result) => {
				if (err) return console.log(err);
				db.collection('comments')
					.find({
						postId: postId,
					})
				// making another array out of the post object called result 02
					.toArray((err, result02) => {
						res.render('post.ejs', {
							// we are telling the ejs it can grab the following properties and all of its content
							user: req.user,
							// we are assigning the post to the result array 
							posts: result,
							// we are assignng the comments to the result 02 array
							comments: result02,
						});
					});
			});
	});

	//profile page
	//  we are getting the clients information from the front end 
	app.get('/page/:id', isLoggedIn, function (req, res) {
		let params = req.params.id;
		console.log(params);
		let postId = ObjectId(params);
		db.collection('posts')
		// we are checking if postBy and postId is in the mongo db 
			.find({ postedBy: postId })
			// we are creating an array with those documents 
			.toArray((err, result) => {
				if (err) return console.log(err);
				res.render('page.ejs', {
					// the array is now accesible for the page to access 
					posts: result,
				});
			});
	});

	// LOGOUT ==============================
	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

	// post routes
	// we are creating a route 
	app.post('/makePost', upload.single('file-to-upload'), (req, res) => {
		// we are creating variables that pull info from the front end that will be accesed in the database 
		let name = req.user.local.email
		console.log(name, 'name')
		// we are creating variable to hold the value of the data accessed in the front end 
		let user = req.user._id;
		// we are creating properties inside of the collections documents that holds infro from the front end 
		db.collection('posts').save(
			{
				caption: req.body.caption,
				img: 'images/uploads/' + req.file.filename,
				postedBy: user,
				name: name,
			},
			// this is saying its either an error or a send result to the page 
			(err, result) => {
				if (err) return console.log(err);
				console.log('saved to database');
				res.redirect('/profile');
			}
		);
	});
// this is creating the comments 
	app.post('/comment/:singleComment', (req, res) => {
//we are creating and object from the requested single comment which is the parameter and assigning it to postId
		let postId = ObjectId(req.params.singleComment);
		console.log('object', postId);
		// we are saving the front end info to the database
		db.collection('comments').save(
			// the value of the comment property is coming from the results from the form request
			{ comment: req.body.comment, postId: postId },
			//if its an error console log error if its not then create a new route
			(err, result) => {
				if (err) return console.log(err);
				console.log('saved to database');
				res.redirect(`/post/${postId}`);
			}
		);
	});

	// message board routes ===============================================================
// this is updating data 
	app.put('/likePost', (req, res) => {
		// we are creating an object with the ifnromation that is coming from the main js
		let likedPostId = ObjectId(req.body.likedPostId);
		// we are in the db collection and assigning id to the object likePostId
		db.collection('posts').findOneAndUpdate(
			{ _id: likedPostId },
			{//increment operator to increment a field (postLikes)
				$inc: {
					//incrementing the postLikes (not in the db initially, but is created once the initial incrementation happens) value by one
					postLikes: 1,
				},
			},
			{
				//showing us most recent post (based on id) from the object first
				sort: { _id: -1 },
				//combination of updating and inserting, if object doesn't exist create it; doesn't look like this is being used
				upsert: true,
			},
			//if error, return an error message; otherwise ->
			(err, result) => {
				if (err) return res.send(err);
				//respond with object (postId, likes)
				res.send(result);
			}
		);
	});
	
	// app.delete('/messages', (req, res) => {
	// 	db.collection('messages').findOneAndDelete(
	// 		{ name: req.body.name, msg: req.body.msg },
	// 		(err, result) => {
	// 			if (err) return res.send(500, err);
	// 			res.send('Message deleted!');
	// 		}
	// 	);
	// });

	// =============================================================================
	// AUTHENTICATE (FIRST LOGIN) ==================================================
	// =============================================================================

	// locally --------------------------------
	// LOGIN ===============================
	// show the login form
	app.get('/login', function (req, res) {
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post(
		'/login',
		passport.authenticate('local-login', {
			successRedirect: '/feed', // redirect to the secure profile section
			failureRedirect: '/login', // redirect back to the signup page if there is an error
			failureFlash: true, // allow flash messages
		})
	);

	// SIGNUP =================================
	// show the signup form
	app.get('/signup', function (req, res) {
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post(
		'/signup',
		passport.authenticate('local-signup', {
			successRedirect: '/profile', // redirect to the secure profile section
			failureRedirect: '/signup', // redirect back to the signup page if there is an error
			failureFlash: true, // allow flash messages
		})
	);

	// =============================================================================
	// UNLINK ACCOUNTS =============================================================
	// =============================================================================
	// used to unlink accounts. for social accounts, just remove the token
	// for local account, remove email and password
	// user account will stay active in case they want to reconnect in the future

	// local -----------------------------------
	app.get('/unlink/local', isLoggedIn, function (req, res) {
		var user = req.user;
		user.local.email = undefined;
		user.local.password = undefined;
		user.save(function (err) {
			res.redirect('/profile');
		});
	});
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) return next();

	res.redirect('/');
}
