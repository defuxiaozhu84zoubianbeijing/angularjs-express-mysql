var crypto = require('crypto');
var log = require('log4js').getLogger('User');
var accessLevels = require('../../frontend/app/scripts/common/routingConfig').accessLevels;
//var Q = require('q');
//var deasync = require('deasync');

module.exports = function(orm, db) {

    var User = db.define('users', {

        email: {
            type: 'text',
            required: true,
            unique: true
        },
        role_id: {
            type: 'integer'
        },
        profile_id: {
          type: 'integer'
        },
        active: {
          type: 'boolean'
        },
        encrypted_password: {
            type: 'text'
        },
        password_salt: {
            type: 'text'
        },
        reset_password_token: {
            type: 'text',
            unique: true
        },
        remember_token: {
            type: 'text'
        },
        remember_created_at: {
            type: 'date',
            time: true
        },
        sign_in_count: {
            type: 'integer'
        },
        current_sign_in_at: {
            type: 'date',
            time: true
        },
        last_sign_in_at: {
            type: 'date',
            time: true
        },
        current_sign_in_ip: {
            type: 'text'
        },
        last_sign_in_ip: {
            type: 'text'
        },
        created_at: {
            type: 'date',
            time: true
        },
        updated_at: {
            type: 'date',
            required: true,
            time: true
        }

    }, {
        cache: false,
        autoFetch: false,
        autoFetchLimit: 1,
        methods: {
            serialize: function() {
                return {
                    id: this.id,
                    email: this.email,
                    profile_id: this.profile_id,
                    role: this.role,
                    profile: this.profile
                };
            },
            /**
             * Authenticate - check if the passwords are the same
             */

            authenticate: function(plainText) {
                //log.debug('>> plainText: '+ plainText);
                //log.debug('>> this.encrypted_password: '+ this.encrypted_password);
                //log.debug('>> this.encryptPassword(plainText): '+ this.encryptPassword(plainText));
                //log.debug(JSON.stringify(this));

                return this.encryptPassword(plainText) === this.encrypted_password;
            },

            authorize: function( accessLevel){
                if(typeof accessLevel === 'string'){
                    accessLevel = accessLevels[accessLevel];
                    //console.log(accessLevel)
                }

                if(this.role){
                    return (accessLevel.bit_mask & this.role.bit_mask);
                } else {
                    log.info('>>email:' +this.email);
                    log.info(this.role_id);
                    var Role = db.models.roles;
                    var access;
                    Role.get(this.role_id, function (err, role) {
                    //this.getRole(function (err, role) {
                        if (err) {
                            log.error(err);
                            access = false;
                        } else {
                            access = (accessLevel.bit_mask & role.bit_mask);
                        }
                        return access;
                    });
               }
            },

            /**
             * Make salt
             */

            makeSalt: function() {
                return crypto.randomBytes(16).toString('hex');
            },

            /**
             * Encrypt password
             */
            encryptPassword: function(password) {
                if (!password || !this.password_salt) return '';
                var salt = new Buffer(this.password_salt, 'hex');
                return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('hex');
            }

            /*
            , randomToken: function() {
                return Math.round((new Date().valueOf() * Math.random())) + '';
            }
            */
        },
        validations: {
            //encrypted_password: orm.validators.equalToProperty(this.retype_password, 'Passwords don't match'),
            //encrypted_password : 
            //	orm.validators.equalToProperty( this.retype_password, 'Passwords don't match.'),
            //orm.validators.rangeLength(5, undefined, 'Password must be at least 5 characters!'),

            email: [
                orm.validators.patterns.email('The specified email is invalid.'),
                orm.validators.unique('The specified email address is already in use.')
            ]
        },
        hooks: {
            beforeValidation: function() {
                this.updated_at = new Date();
            },
            afterLoad: function () {

            },
            beforeSave: function() {

            },
            beforeCreate: function() {
                this.created_at = new Date();
            }
        }

    });
    // creates column 'customer_id' in 'users' table
    User.hasOne('role', db.models.roles, {});
    User.hasOne('profile', db.models.profiles,{});

    User.makeSalt = function() {
        return crypto.randomBytes(16).toString('hex');
    };

    User.createAdminUser = function(email, password, callback){
        var Role = db.models.roles;
        var user = this;
        //log.debug(this);
        user.count(function(err, count){
            if(count == 0) {
                Role.one({title:'admin'}, function(err, role){
                    if(err || !role) return callback(err || 'role is empty');
                    User.create({
                        email: email,
                        role_id: role.id,
                        active: true,
                        password_salt: user.makeSalt()
                    }, function(err, user) {
                        if (err) return callback(err);
                        user.encrypted_password = user.encryptPassword(password);
                        user.save(function(err, user){
                            return callback(null, user);
                        });
                    });
                });
            }
        })
    };

    User.findOne = function(user, callback) {
        //console.log('>> findOne user:' + JSON.stringify(user));
        // Model.find([ conditions ] [, options ] [, limit ] [, order ] [, cb ])
        //this.find({email: user.email, encrypted_password: this.encryptPassword(user.password)}, 1, callback); // limit 1
        this.one({
            email: user.email
        }, function(err, person) {
            if (err) {
                callback(err);
            } else {
                //log.debug('>> person: '+ JSON.stringify(person));
                //console.log('>> user.password: '+ user.password);
                //console.log('>> person.encrypted_password: '+ person.encrypted_password);
                //console.log('>> person.encryptPassword(user.password): '+ person.encryptPassword(user.password));
                //if (person.encrypted_password === person.encryptPassword(user.password)) {
                if (person.authenticate(user.password)) {
                    callback(null, person);
                } else {
                    var errors = [{
                        property: 'encrypted_password',
                        msg: 'Password is incorrect!',
                        value: user.password
                    }];
                    callback(errors);
                }
            }
        });
    };

    User.findByPasswordToken = function(user, callback) {
        this.one({
            email: user.email,
            reset_password_token: user.reset_password_token
        }, function(err, person) {
            if (err) {
                callback(err);
            } else {
            	if(!person){
	                    var errors = [{
	                        property: 'retype_password',
	                        msg: 'Password token is invalid.',
	                        value: user.password
	                    }];
	                    callback(errors);
	             } else {
            		callback(null, person);
            	}
            }
        });
    };

    //	Person.find({ surname: "Doe" }).limit(3).offset(2).only("name", "surname").run(function (err, people) {
    // finds people with surname='Doe', skips first 2 and limits to 3 elements,
    // returning only 'name' and 'surname' properties
};
