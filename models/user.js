const mongoose = require('mongoose')

const Schema = mongoose.Schema

const UserSchema = new Schema({
    first_name: {type: String},
    last_name: {type: String},
    username: {type: String},
    password: {type: String},
    membership: {type: Boolean},
    admin: {type: Boolean, default: false}
})

UserSchema.virtual('name').get(function(){
    
    let fullname = ''

    if(this.first_name && this.last_name) {
        fullname = `${this.first_name} ${this.last_name}`
    }

    return fullname
})

module.exports = mongoose.model('User', UserSchema)