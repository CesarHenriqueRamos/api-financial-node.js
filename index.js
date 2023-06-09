const express = require('express')
const {v4: uuidv4} = require('uuid')

const app = express()
app.use(express.json())
const customers = []

function verifyIfExistsAccounts(request,response,next){
  const {token} = request.headers
  const customer = customers.find(customer => customer.cpf === token)
  if(!customer){
    return response.status(400).json({error:'Customer not found'})
  }
  request.customer = customer
  return next()
}

function getBalance(statement){
  const balance = statement.reduce((accumulator, operation) => {
    if(operation.type === 'credit'){
      return accumulator + operation.amount
    }else{
      return accumulator - operation.amount
    }
  },0);
  return balance
}

app.post('/account',(request, response)=>{
  const {name, cpf} = request.body
  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf)
  if(customerAlreadyExists){
   return response.status(400).json({error:'Customer Already Exists'})
  }

  customers.push({
    id:uuidv4(),
    name,
    cpf,
    statement :[]
  })

  return response.status(201).send()
})

app.get('/listen', (request, response) => {
 
  return response.status(200).json(customers)
})

//para usar o widdlewares para todas as rotas apoes ele
//app.use(verifyIfExistsAccounts())

app.get('/statements',verifyIfExistsAccounts, (request, response) => {
  const {customer} = request

  return response.status(200).json(customer.statement)
})

app.post('/deposit',verifyIfExistsAccounts, (request, response) => {
  const {description, amount} = request.body

  const {customer} = request;
  const statementOperation = {
    description,
    amount,
    type:'credit',
    created_at:new Date(),
  }
  customer.statement.push(statementOperation)

  return response.status(201).json(customer.statement)
})

app.post('/withdraw',verifyIfExistsAccounts, (request, response) => {
  const {amount} = request.body

  const {customer} = request;
  const balance = getBalance(customer.statement)
  if(balance < amount){
    return response.status(400).json({error:"Insufficient funds"})
  }
  const statementOperation = {
    amount,
    type:'debit',
    created_at:new Date(),
  }

  customer.statement.push(statementOperation)

  return response.status(201).json(customer.statement)
})

app.get('/statements/date',verifyIfExistsAccounts, (request, response) => {
  const {customer} = request
  const {date} = request.query
  const dateFormat = new Date(date + " 00:00")

  const statements = customer.statement.filter((statement) => 
  statement.created_at.toDateString() === new Date(dateFormat).toDateString())

  return response.status(200).json(statements)
})

app.put('/account', verifyIfExistsAccounts, (request, response) =>{
  const {name} = request.body
  const {customer} = request
  customer.name = name
  return response.status(201).send()
})

app.get('/account', verifyIfExistsAccounts, (request, response) =>{
  const {customer} = request
  return response.status(201).json(customer)
})

app.delete('/account', verifyIfExistsAccounts, (request, response) =>{
  const {customer} = request

  customers.splice(customer, 1)

  return response.status(200).json(customers)
})

app.get('/balance', verifyIfExistsAccounts, (request, response) =>{
  const {customer} = request
  const balance = getBalance(customer.statement)
  return response.status(201).json({"balance":balance})
})

app.listen(3333)