'use strict'

const bcrypt = require('bcrypt-nodejs');
const mongoosePaginate = require('mongoose-pagination');
const fs = require('fs');
const path = require('path');

const User = require('../models/user');
const Follow = require('../models/follow');
const Publication = require('../models/publication');
const jwt = require('../services/jwt');

function home(req, res) {
    res.status(200).send({ message: 'Hola Mundo' });
}

function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({ message: 'Acción post' });
}

function saveUser(req, res) {
    let params = req.body
    let user = new User()

    if (params.name && params.surname && params.nick && params.email && params.password) {
        user.name = params.name
        user.surname = params.surname
        user.nick = params.nick
        user.email = params.email
        user.password = params.password
        user.role = 'ROLE_USER'
        user.image = null

        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error en la petición de usuarios' })

            if (users && users.length >= 1) {
                return res.status(200).send({ message: 'El usuario que intentas registrar ya existe' })
            } else {
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;
                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar el usuario.' })

                        if (userStored) {
                            res.status(200).send({ user: userStored })
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario.' })
                        }
                    })
                })
            }
        })
    } else {
        res.status(200).send({ message: 'Envia todos los campos necesarios' })
    }
}

function loginUser(req, res) {
    var params = req.body

    var email = params.email
    var password = params.password

    User.findOne({ email: email }, (err, user) => {
        if (err) res.status(500).send({ message: 'Error en la peticion' })

        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    if (params.gettoken) {
                        //generar y devolver token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        })
                    } else {
                        //devolver datos de los usuarios
                        user.password = undefined
                        return res.status(200).send({ user })
                    }
                } else {
                    return res.status(500).send({ message: 'El usuario no se ha podido identificar' })
                }
            })
        } else {
            return res.status(500).send({ message: 'El usuario no se ha podido identificar!!' })
        }
    })
}

function getUser(req, res) {
    let userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) res.status(500).send({ message: 'Error en la peticion' });

        if (!user) res.status(404).send({ message: 'Usuario no existe' });

        followThisUser(req.user.sub, userId).then((value) => {
            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed
            });
        });
    });
}

async function followThisUser(identity_user_id, userId) {
    let following = await Follow.findOne({ "user": identity_user_id, "followed": userId }).exec((err, follow) => {
        if (err) return handleError(err);
        return follow;
    });

    let followed = await Follow.findOne({ "user": userId, "followed": identity_user_id }).exec((err, follow) => {
        if (err) return handleError(err);
        return follow;
    });

    return {
        following: following,
        followed: followed
    }
}

function getUsers(req, res) {
    let identity_user_id = req.user.sub;

    let page = 1;

    if (req.params.page) {
        page = req.params.page;
    }

    let itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (err) res.status(500).send({ message: 'Error en la peticion' });

        if (!users) res.status(404).send({ message: 'No hay usuarios disponibles' });

        followUserIds(identity_user_id).then((value) => {
            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                page: Math.ceil(total / itemsPerPage)
            });
        });
    });
}

async function followUserIds(user_id) {
    let following = await Follow.find({ "user": user_id }).select({ '_id': 0, '_v': 0, 'user': 0 }).exec((err, follows) => {
        return follows;
    });

    let followed = await Follow.find({ "followed": user_id }).select({ '_id': 0, '_v': 0, 'followed': 0 }).exec((err, follows) => {
        return follows;
    });

    //Procesar following ids
    let following_clean = [];

    following.forEach((follow) => {
        following_clean.push(follow.followed);
    });
    //Procesar followed ids
    let followed_clean = [];

    followed.forEach((follow) => {
        followed_clean.push(follow.user);
    });

    return {
        following: following_clean,
        followed_clean: followed_clean
    }
}

function getCounters(req, res) {
    let userId = req.user.sub;
    if (req.params.id) {
        userId = req.params.id;
    }

    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);
    });
}

async function getCountFollow(user_id) {
    let following = await Follow.count({ "user": user_id }).exec((err, count) => {
        if (err) return handleError(err);
        return count;
    });

    let followed = await Follow.count({ "followed": user_id }).exec((err, count) => {
        if (err) return handleError(err);
        return count;
    });

    let publications = await Publication.count({ "user": user_id }).exec((err, count) => {
        if (err) return handleError(err);
        return count;
    });

    return {
        following: following,
        followed: followed,
        publications: publications
    }
}

function updateUser(req, res) {
    let userId = req.params.id;
    let update = req.body;

    //borrar propiedad password
    delete update.password;

    if (userId != req.user.sub) {
        return res.status(500).send({ message: 'No tienes permiso para actualizar los datos del usuario' });
    }

    User.find({
        $or: [
            { email: update.email.toLowerCase() },
            { nick: update.nick.toLowerCase() }
        ]
    }).exec((err, users) => {
        let user_isset = false;
        users.forEach((user) => {
            if (user && user._id != userId) user_isset = true;
        });

        if (user_isset) return res.status(404).send({ message: 'Los datos ya estan en uso' });

        User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
            if (err) return res.status(500).send({ message: 'Error en la peticion' });

            if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actulizar el usuario' });

            return res.status(200).send({ user: userUpdated });
        });

    });
}

//subir archivos de imagene/avatar de usuario
function uploadImage(req, res) {
    let userId = req.params.id;

    if (req.files) {
        let file_path = req.files.image.path;
        console.log(file_path);

        let file_split = file_path.split('\\');
        console.log(file_split);        

        //Comportamiento de file en windows
        /*let file_name = file_split[2];
        console.log(file_path);*/

        //Comportamiento de file en Linux
        let file_name = file_split[0];
        console.log(file_path);

        let file_name_li = file_name.substring(14,50);
        console.log(file_name_li);

        let ext_split = file_name_li.split('\.');
        console.log(ext_split);
        
        let file_ext = ext_split[1];
        console.log(file_ext);
        
        if (userId != req.user.sub) {
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos del usuario');
        }

        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            //Actualizar documento de usuario logueado
            User.findByIdAndUpdate(userId, { image: file_name_li }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: 'Error en la peticion' });

                if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actulizar el usuario' });

                return res.status(200).send({ user: userUpdated });
            });
        } else {
            return removeFilesOfUploads(res, file_path, 'Extencion no valida');
        }
    } else {
        return res.status(200).send({ message: 'No se ha subido imagenes' })
    }
}

function removeFilesOfUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(200).send({ message: message });
    });
}

function getImageFile(req, res) {
    let image_file = req.params.imageFile;
    let path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen.' });
        }
    });
}

module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile
}