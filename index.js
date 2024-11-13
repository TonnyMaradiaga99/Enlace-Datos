const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ping = require('ping');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const ips = [];
const ipStatus = {};

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'ejemplo@gmail.com',
    pass: 'HolaHola'
  }
});

function sendNotification(ip) {
  const mailOptions = {
    from: 'ejemplo@gmail.com',
    to: 'ejemplo2@gmail.com', 
    subject: `Alerta: El dispositivo con IP ${ip} se ha desconectado`,
    text: `El dispositivo con IP ${ip} ha cambiado a estado inactivo.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(`Error al enviar correo: ${error}`);
    } else {
      console.log(`Correo enviado: ${info.response}`);
    }
  });
}

app.use(express.static('public'));

app.use(express.json());
app.post('/add-ip', (req, res) => {
  const { ip } = req.body;
  if (!ips.includes(ip)) {
    ips.push(ip);
    ipStatus[ip] = { isAlive: null, activeTime: 0, inactiveTime: 0, lastChecked: Date.now(), notified: false };
    res.status(200).send({ message: 'IP añadida exitosamente' });
  } else {
    res.status(400).send({ message: 'La IP ya está en la lista' });
  }
});


function checkIPStatus() {
  const now = Date.now();
  ips.forEach((ip) => {
    ping.sys.probe(ip, (isAlive) => {
      if (ipStatus[ip].isAlive !== isAlive) {
        ipStatus[ip].isAlive = isAlive;
        ipStatus[ip].lastChecked = now;
        ipStatus[ip].notified = false;
      }

    
      const timeDiff = Math.floor((now - ipStatus[ip].lastChecked) / 1000);
      if (isAlive) {
        ipStatus[ip].activeTime += timeDiff;
        ipStatus[ip].inactiveTime = 0;
      } else {
        ipStatus[ip].inactiveTime += timeDiff;
        ipStatus[ip].activeTime = 0;


        if (!ipStatus[ip].notified) {
          sendNotification(ip);
          ipStatus[ip].notified = true;
        }
      }

      io.emit('ipStatus', { 
        ip, 
        isAlive, 
        activeTime: ipStatus[ip].activeTime, 
        inactiveTime: ipStatus[ip].inactiveTime 
      });
    });
  });
}


setInterval(checkIPStatus, 1000);

server.listen(3000, () => {
  console.log('Servidor en http://localhost:3000');
});
