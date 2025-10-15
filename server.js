const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const userRouter = require('./Routes/user.route')


require('dotenv').config(); 

const corsOptions = {
  origin: 'https://acupclient.onrender.com'
};
app.use(cors(corsOptions));
require('ejs')
app.set('view engine', 'ejs')
// Middleware
app.use(express.urlencoded({extended: true}));
app.use(express.json());



app.use(cors());
app.use('/api/user', userRouter)

app.get("/", (req, res)=>{
    res.send("Welcome to AUTH API")
});

mongoose.connect(process.env.URI)
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => {console.error("❌ Error connecting to MongoDB:", err);});
// Start server
app.listen(process.env.PORT, () => {
    console.log(`Server started at ${process.env.PORT}`);
});