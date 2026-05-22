import express, { type Application, type Request, type Response } from 'express'
const app : Application = express()
const port = 5000

app.use(express.json()) // Middleware to parse JSON bodies


app.get('/api/users', (req : Request, res : Response) => {
//   res.send('Welcome to DevPulse!')
res.status(200).json({ message: "Welcome to DevPulse!" })
})

app.post  ('/api/users', async (req : Request, res : Response) => {
    // res.status(201).json({ message: "User created successfully!" })

    console.log(req.body);
})

app.listen(port, () => {
  console.log(` DevPulse app listening on port ${port}`)
})