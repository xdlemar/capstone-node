const nodemailer = require("nodemailer");
const net = require("net");
const tls = require("tls");

function resolveHost(host) {
  return new Promise((resolve) => {
    net.lookup(host, (err) => {
      if (!err) return resolve(host);
      const match = host.match(/^(smtp\.)?(.+)$/i);
      if (!match) return resolve(host);
      const fallback = match[2];
      net.lookup(fallback, (err2) => {
        resolve(err2 ? host : fallback);
      });
    });
  });
}
