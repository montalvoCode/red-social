'use strict'

const mongoose = require('mongoose')
const app = require('./app')
const config = require('./config')

//Conexion de la DataBase
mongoose.Promise = global.Promise
mongoose.connect(config.db,{useMongoClient : true})
    .then(() =>{            
            console.log('La Conexión a la base de datos redSocial es correcta')            
            //Crear servidor
            app.listen(config.port, () => {
                console.log('Servidor corriendo http://localhost:3001')
            })
        })
        .catch(err => console.log(err))
