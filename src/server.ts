import express from 'express'
import { keys } from 'ts-transformer-keys'

let users = [
  {
    id: '4a0788f9-b851-4f86-8785-7f259cafa464',
    firstName: 'John',
    lastName: 'Doe',
    birthYear: 1990,
  },
]

interface UpdateUserDto {
  firstName?: string
  lastName?: string
  birthYear?: number
}

const app = express()

app.use(express.json())

app.get('/', (req, res) => res.send({ message: 'Hello World!' }))

app.get('/api/users', (req, res) => {
  res.send(users)
})

app.put('/api/users/v1/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: 'Not found' }) // 2
  const json = req.body // 3
  const updatedUser = { ...user, ...json } // 4
  users = users.map((u) => (u.id !== updatedUser.id ? updatedUser.id : updatedUser)) // 5
  res.send(updatedUser) // 6
})

app.put('/api/users/v2/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: 'Not found' }) // 2
  const json = req.body // 3
  user.firstName = json.firstName || user.firstName // 4
  user.lastName = json.lastName || user.lastName // 4
  user.birthYear = json.birthYear || user.birthYear // 4
  res.send(user) // 5
})

app.put('/api/users/v3/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: 'Not found' }) // 2
  const json = req.body // 3
  const keysOfUpdateUserDto = keys<UpdateUserDto>() // 4
  keysOfUpdateUserDto.forEach((k) => (user[k] = json[k] || user[k])) // 5
  res.send(user) // 6
})

app.put('/api/users/v4/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: 'Not found' }) // 2
  const json = req.body // 3
  const keysOfUpdateUserDto = keys<UpdateUserDto>() // 4
  const notAllowedKeys = Object.keys(json).filter((k) => !keysOfUpdateUserDto.find((ku) => ku === k)) // 5
  if (notAllowedKeys.length) return res.status(403).send({ message: `invalid properties: [${notAllowedKeys}]` }) // 6
  keysOfUpdateUserDto.forEach((k) => (user[k] = json[k] || user[k])) // 7
  res.send(user) // 8
})

app.listen(3000, () => console.log('Example app listening on port 3000!'))
