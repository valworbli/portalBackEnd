const userModel = require('../models/user.js')
const jwt = require('../components/jwt.js');
const account = require('../components/account.js');
const onfido = require('../components/onfido.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;


function post_login(req, res) {
    const email = req.body.email;
    const plaintextPassword = req.body.password;
    userModel.find({email},(err, data) => {
        if (!err && data) {
            const hash = data[0].password;
            const mongo_id = data[0]._id;
            const email = data[0].email;
            const onfido_status = data[0].onfido_status
            const onfido_id = data[0].onfido_id || null
            bcrypt.compare(plaintextPassword, hash, function(err, data) {
                if(data === true){
                    const token = jwt.jwt_expires({email, mongo_id, onfido_status, onfido_id}, '72h');
                    res.status(200).json({data: true, token})
                } else {
                    res.status(400).json({data: false})
                }
            });
        } else {
            res.status(400).json({data: false})
        }
    })
}




function post_auth(req, res) {
    const bearer = req.headers.authorization.split(" ")
    const token = bearer[1];
    jwt.jwt_decode(token)
    .then((data) => {
        const onfido_status = data.onfido_status;
        res.status(200).json({data: true, onfido_status})
    })
    .catch((err) => {
        res.status(400).json({data: false})
    })
}


function post_password(req, res) {
    const plaintextPassword = req.body.password;
    const bearer = req.headers.authorization.split(" ")
    const token = bearer[1];
    jwt.jwt_decode(token)
    .then((data) => {
        bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
            if (!err){
                const password = hash;
                const email = data.email;
                const newData = {password}
                const query = {email};
                userModel.findOneAndUpdate(query, newData, {upsert:true}, (err, doc) => {
                    if (!err){
                        res.status(200).json({data: true})
                    } else {
                        res.status(400).json({data: false})
                    }
                });
            }
        })
    })
    .catch((err) => {
        res.status(400).json({data: false})
    })
}

function post_profile(req, res) {
    const bearer = req.headers.authorization.split(" ")
    const token = bearer[1];
    jwt.jwt_decode(token)
    .then((jwtdata) => {
        console.log(jwtdata)
        const onfido_id = jwtdata.onfido_id;
        const email = jwtdata.email;
        const name_first = req.body.name_first;
        const name_middle = req.body.name_middle;
        const name_last = req.body.name_last;
        const address_one = req.body.address_one;
        const address_two = req.body.address_two;
        const address_city = req.body.address_city;
        const address_region = req.body.address_region;
        const address_zip = req.body.address_zip;
        const address_country = req.body.address_country;
        const phone_code = req.body.phone_code;
        const phone_mobile = req.body.phone_mobile;
        const date_birth = req.body.date_birth;
        const gender = req.body.gender;
        const query = {email}
        const newData = {name_first, name_middle, name_last, address_one, address_two, address_city, address_region, address_zip, address_country, phone_code, phone_mobile, date_birth, gender};
        userModel.findOneAndUpdate(query, newData, {upsert:true}, (err, doc) => {
            if (!err){
                onfido.update_applicant(newData, onfido_id)
                .then(()=>{
                    res.status(200).json({data: true})
                })
                .catch(()=>{
                    res.status(400).json({data: false})
                })
            } else {
                console.log(err)
                res.status(400).json({data: false})
            }
        });
    })
    .catch((jwtdata) => {
        res.status(400).json({data: false})
    })
}

function get_profile(req, res) {
    const bearer = req.headers.authorization.split(" ")
    const token = bearer[1];
    jwt.jwt_decode(token)
    .then((jwtdata) => {
        const email = jwtdata.email;
        userModel.find({email},(err, data) => {
            if (!err && data) {
                let profile = data[0];
                profile.password = "*********";
                res.status(200).json({data: true, profile: profile})
            } else {
                res.status(400).json({data: false})
            }
        })
    })
}
function put_profile(req, res) {
    console.log(req.body)
    res.json(true)
}



function post_account(req, res) {
    // TODO: chdck onfido reports are all good
    const worbli_account_name = req.body.worbli_account_name;
    const public_key_active = req.body.public_key_active;
    const public_key_owner = req.body.public_key_owner;
    const newAccount = {worbli_account_name, public_key_active, public_key_owner}
    const bearer = req.headers.authorization.split(" ")
    const token = bearer[1];
    let jwtData;
    jwt.jwt_decode(token)
    .then((jwtdata) => {
        jwtData = jwtdata;
        return account.check_exists(worbli_account_name)
    })
    .then((exists) => {
        if(exists === true){
            res.status(400).json({data: false})
        } else {
            return account.create_account(newAccount)
        }
    })
    .then((data) => {
        const email = jwtData.email;
        const newData = {worbli_account_name}
        const query = {email};
        userModel.findOneAndUpdate(query, newData, {upsert:true}, (err, doc) => {
            if (!err){
                res.status(200).json({data: true})
            } else {
                res.status(400).json({data: false})
            }
        });
    })
    .catch((err) => {
        res.status(400).json({data: false})
    })
}



function get_account(req, res) {
    console.log(req.body)
    res.json(true)
}
function post_snapshot(req, res) {
    console.log(req.body)
    res.json(true)
}


module.exports = { post_login, post_auth, post_profile, get_profile, put_profile, post_account, get_account, post_snapshot, post_password};
