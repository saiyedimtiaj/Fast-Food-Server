const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.use(cookieParser())
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173","https://cute-gaufre-0d1653.netlify.app"],
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xslrw3a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware
const verifyToken = async(req,res,next)=>{
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message:'unAuthoridze'})
  }

  jwt.verify(token,process.env.USER_ACCESS_SCRATE,(err,decode)=>{
    if(err){
      return res.status(401).send({message:'unAuthoridze'})
    }
    res.user = decode
    console.log('decoded',res.user.email);
    next()
  })
}

async function run() {
  try {
    // await client.connect();

    const productColluction = client.db("resturent-mannagement").collection("allproduct");
    const orderColluction = client.db("resturent-mannagement").collection("order");
    const userColluction = client.db("resturent-mannagement").collection("user");


    //jwt

    app.post('/jwt',async(req,res)=>{
      const email = req.body;
      const token = jwt.sign(email,process.env.USER_ACCESS_SCRATE,{expiresIn:'10h'});
      res.cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite: 'none'
      }).send({sucess:true})
    })

    app.post('/logout',async(req,res)=>{
      res.clearCookie('token',{maxAge:0}).send({message:true})
    })

    //user
    app.post('/user',async(req,res)=>{
      const user = req.body;
      const result = await userColluction.insertOne(user)
      res.send(result)
    })

    //all-food
    app.post("/all-food", async (req, res) => {
      const body = req.body;
      const result = await productColluction.insertOne(body);
      res.send(result);
    });

    app.get('/productCount',async(req,res)=>{
      const total = await productColluction.estimatedDocumentCount();
      res.send({total})
    })

    app.get("/all-food", async (req, res) => {
      const userEmail = req.query.email;
      const query = {}
      const sortObj = {}
      const skip = parseInt(req?.query?.skip)
      const limit = parseInt(req?.query?.limit)
      const  sortby = req?.query?.sortby
      const  sortOrder = req?.query?.sortOrder
      if (req.query?.email) {
        query.email = userEmail;
      }
      if(sortby && sortOrder){
        sortObj[sortby] = sortOrder
      }
      const result = await productColluction.find(query).sort(sortObj).skip(skip * limit).limit(limit).toArray();
      res.send(result);
    });

    app.get("/all-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productColluction.findOne(query);
      res.send(result);
    });

    app.put('/all-food/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const sum = 1; 
      const update = req.body.updateOrder;
      console.log(update + sum);
      const updateDoc = {
        $set:{
          orderCount:update + sum
        }
      }
      const result = await productColluction.updateOne(filter,updateDoc);
      res.send(result)
    })

    app.patch('/all-food/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id:new ObjectId(id)};
      const update = req.body;
      const updateDoc = {
        $set:{
          foodName : update.foodName,
          category : update.category,
          image : update.image,
          quantity : update.quantity,
          price : update.price,
          orgin : update.orgin,
          description : update.description,
        }
      }
      const options = { upsert: true };
      const result = await productColluction.updateOne(filter,updateDoc,options)
      res.send(result)
    })

    //order

    app.post("/order", async (req, res) => {
      const body = req.body;
      const result = await orderColluction.insertOne(body);
      res.send(result);
    });


    app.get("/order", verifyToken, async (req, res) => {
      const userEmail = req?.query?.email;
      const query = {};
      if(res?.user?.email !== req?.query?.email){
        res.status(403).send({message:'forviden'})
      }
      if (req.query?.email) {
        query.email = userEmail;
      }
      const result = await orderColluction.find(query).toArray();
      res.send(result);
    });

    app.delete('/order/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await orderColluction.deleteOne(query);
      res.send(result)
    })

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
