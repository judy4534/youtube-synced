const Room = require('../models/room.js');
const User = require('../models/user.js');
const urllib = require('urllib');
const parse = require('url-parse');
const bcrypt = require('bcryptjs');

/**
 * Home Page
 */

const main_index = (req, res) => {
    res.render('index', {title: 'Home'});
}

/**
 * The login page
 */

const main_login_get = (req, res) => {
    let inValid = false;
    if (req.query.inValid) {
        inValid = true;
    }
    res.render('login', {title: 'Login', inValid});
}

/**
 * THe Sign Up Page
 */

const main_signUp_get = (req, res) => {
    res.render('sign-up', {title: 'Sign Up'});
}

/**
 * The Forgot Password page
 */
const main_forgotPassword_get = (req, res) => {
    res.render('forgot-password', {title: 'Forgot Password'});
}

/**
 * The page shown if multiple tabs of the site are opened
 */

const main_noAccess_get = (req, res) => {
    res.render('noAccess', {title: 'No Access'});
}

/**
 * Used by Fetch API to get youtube video ID
 */

const main_videoID_get = (req, res) => {
    res.send(JSON.stringify(req.session.embedID));
}

/**
 * Used by Fetch API to verify the URL entered on the home page
 */

const main_checkURL_get = (req, res) => {
    const url = req.query.url;
    urllib.request(url)
    .then( response => {

        if (response.status != 200){
            res.send(JSON.stringify('That URL is not a valid YouTube URL'));
        } else {
            res.send(JSON.stringify('Valid'));
        }
    })
    .catch(err => {
        res.send(JSON.stringify('That URL is not a valid YouTube URL'));
    })

}

/**
 * Used by Fetch API to verify the room entered is valid
 */

const main_checkRoom_get = (req, res) => {
    const roomValue = (req.query.room || '').trim();
    const room = parseInt(roomValue, 10);
    if (!roomValue || roomValue.length < 5 || Number.isNaN(room)) {
        res.send(JSON.stringify('Not Valid'));
    } else {
        Room.findOne({room: room})
        .then(result => {
            if (result == null){
                res.send(JSON.stringify('Not Valid'))
            } else {
                res.send(JSON.stringify('Valid'))
            }
        })
        .catch (err =>
            res.send(JSON.stringify('Not Valid'))
        )
    }

}

/**
 * Page to watch a Youtube Video in sync
 */

const main_watch_post = (req, res) => {
    // do double input check and also check for valid url/room
    if (req.body.room != ''){
        req.session.name = req.body.name;
        req.session.room = req.body.room;
        Room.findOne({room: req.body.room})
        .then( result => {
            req.session.embedID = result.videoID;
            req.session.isMaster = false;
            res.render('watch', {title: 'Watch', room: req.session.room, master: false});
        })
        .catch( err => {

        })
    } else if (req.body.url != '') {
        req.session.name = req.body.name;
        const url = parse(req.body.url, true);   
        req.session.embedID = url.query.v;
        const roomID = Math.floor(Math.random() * 100000);
        req.session.room = roomID;
        const room = new Room({room: roomID, videoID: req.session.embedID});
        req.session.isMaster = true;
        room.save()
        .then( result => {
            res.render('watch', {title: 'Watch', room: req.session.room, master: true});
        })
        .catch( err => {

        })
    }   
}

/**
 * Authorizes a user login
 */
const main_authorize_post = async (req, res) => {
    try {
        const userInfo = await User.findOne({email: req.body.email});
        if (!userInfo) {
            return res.redirect('login?inValid=true');
        }

        const valid = await bcrypt.compare(req.body.password, userInfo.password);
        if (!valid) {
            return res.redirect('login?inValid=true');
        }

        req.session.user = userInfo;
        return res.render('index', {title: 'Home'});
    } catch (err) {
        return res.redirect('login?inValid=true');
    }
}

/**
 * Handles registering a user
 */
const main_signUp_post = async (req, res) => {
    const errors = [];
    try {
        const existingUser = await User.findOne({email: req.body.email});
        if (existingUser) {
            errors.push('Email is already in use.');
        }

        if (!req.body.password || req.body.password.length < 8) {
            errors.push('Password must be at least 8 characters.');
        }
        if (req.body.password !== req.body.repeatPass) {
            errors.push('Passwords do not match.');
        }

        if (errors.length > 0) {
            return res.render('sign-up', {title: 'Sign Up', errors});
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });
        const savedUser = await user.save();
        req.session.user = savedUser;
        return res.redirect('account');
    } catch (err) {
        return res.render('sign-up', {title: 'Sign Up', errors: ['Unable to create account.']});
    }
}

module.exports = {
    main_index,
    main_login_get,
    main_signUp_get,
    main_noAccess_get,
    main_videoID_get,
    main_checkURL_get,
    main_checkRoom_get,
    main_forgotPassword_get,
    main_watch_post,
    main_authorize_post,
    main_signUp_post
};
