const bcrypt = require("bcrypt");
bcrypt.hash("Admin2200", 10, (err, hash) => {
    console.log(hash);
});