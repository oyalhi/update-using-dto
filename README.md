# Update using DTO - with TypeScript

## The Problem

When writing a REST API, the common problem I face is when updating an object with a given object. I need to make sure the update object has only the certain 'allowed' properties so that I don't inadvertently change protected properties, such as a password or any other field that I don't want it to change.

I usually do this by checking each property manually and updating the object accordingly. However, I wanted a better, more re-usable approach, so that I don't have to manually check each property. In this article, I try to explain the steps and the final solution that I've come up with.

Let's assume we have the following `User` interface:

```typescript
export interface User {
  id: string
  firstName: string
  lastName: string
  birthYear: number
  password: string
}
```

## Approach #1 (buggy)

Let's assume that we have a REST API where it allows update to the user. Updatable properties are `firstName`, `lastName` and `birthYear`. We could write the route as follows:

```typescript
app.put("/api/users/v1/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: "Not found" }) // 2
  const json = req.body // 3
  const updatedUser = { ...user, ...json } // 4
  users = users.map(u => (u.id !== updatedUser.id ? updatedUser.id : updatedUser)) // 5
  res.send(updatedUser) // 6
})
```

Here is what is happening:

1. find the user via the `id` from the `params`
2. if not found, send 404 and return
3. get the requested properties to change, which are in `req.body`
4. create a new object that updates the properties with the `json` objects' keys. Here we have a problem though. The new updated user will add any property that is sent via the JSON object or update a property that is not allowed, such as a password. For example, if the JSON object is the following:

   ```typescript
   json: {
     firstName: 'Adelina',
     homeTown: 'Budva',
     password: 'new-password',
     }
   ```

   our code will inadvertently change the password and add a new property `homeTown` which doesn't exist in our interface. Which is far from ideal let's say.

5. update users array with the new user object
6. send back the updated user

## Approach #2

A better approach would be to change only updatable properties:

```typescript
app.put("/api/users/v2/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: "Not found" }) // 2
  const json = req.body // 3
  user.firstName = json.firstName || user.firstName // 4
  user.lastName = json.lastName || user.lastName // 4
  user.birthYear = json.birthYear || user.birthYear // 4
  res.send(user) // 5
})
```

1. find the user via the `id` from the `params`
2. if not found, send 404 and return
3. get the requested properties to change, which are in `req.body`
4. if exists update each property with the new value, if not use the current value
5. send back the updated user

This code would run without bugs. However, what if we had many more properties? What if the properties need to change in the future? We need a more robust way to write it.

## Approach #3

With the help of TypeScript let's define an interface with the updatable properties of our user object:

```typescript
interface UpdateUserDto {
  firstName?: string
  lastName?: string
  birthYear?: string
}
```

What if we could have access to UpdateUserDto interface's keys? We could then iterate the interface keys and update the matching key in the user object. With the help of a custom transformer we can do just that!

The custom transformer we are going to use is, `ts-transformers-key`. It has 2 transformers, one takes the given type and outputs an array of its keys, very handy. The other is used to compile the `keys` function correctly, a necessary part of the library, but we don't use it directly. I go into details on how to install the complete project step by step later below.

Here is the third version of our route:

```typescript
app.put("/api/users/v3/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: "Not found" }) // 2
  const json = req.body // 3
  const keysOfUpdateUserDto = keys<UpdateUserDto>() // 4
  keysOfUpdateUserDto.forEach(k => (user[k] = json[k] || user[k])) // 5
  res.send(user) // 6
})
```

1. find the user via the `id` from the `params`
2. if not found, send 404 and return
3. get the requested properties to change, which are in `req.body`
4. get the all the keys that we are allowed to change, defined by the `UpdateUserDto` data transfer object
5. go over each allowed property, and if it matches the requested key, assign it. If not, then we use the original value. Here, going over the `UpdateUserDto` we are making sure that we are only changing the allowed properties. If the `json` object had a property, let's say `password` because it didn't exist in the DTO, it would be ignored.
6. send back the updated user

## Approach #4

Usually in my apps, instead of just stripping out the illegal properties and using the legal properties, I would like to reject the request all-together. I feel that the front end should send the request correctly and not rely on the back end to fix it's errors. Thus my approach would be the following:

```typescript
app.put("/api/users/v4/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id) // 1
  if (!user) return res.status(404).send({ message: "Not found" }) // 2
  const json = req.body // 3
  const keysOfUpdateUserDto = keys<UpdateUserDto>() // 4
  const notAllowedKeys = Object.keys(json).filter(k => !keysOfUpdateUserDto.find(ku => ku === k)) // 5
  if (notAllowedKeys.length) return res.status(403).send({ message: `invalid properties: [${notAllowedKeys}]` }) // 6
  keysOfUpdateUserDto.forEach(k => (user[k] = json[k] || user[k])) // 7
  res.send(user) // 8
})
```

1. find the user via the `id` from the `params`
2. if not found, send 404 and return
3. get the requested properties to change, which are in `req.body`
4. get the all the keys that we are allowed to change, defined by the `UpdateUserDto` data transfer object
5. from the requested JSON object, filter out the keys that don't exist in the UpdateUserDto
6. length is more than 0 if there are keys that are not present in the DTO, the length would be a truthy. if so, reject the request.
7. go over each allowed property, and if it matches the requested key, assign it. If not, then we use the original value. Here, going over the `UpdateUserDto` we are making sure that we are only changing the allowed properties. If the `json` object had a property, let's say `password` because it didn't exist in the DTO, it would be ignored.
8. send back the updated user

This was our final approach to the problem.

## Step By Step Project Setup

Note that I am using Mac and fish shell (which I highly recommend), so your commands might differ slightly if you are using a different operating system or shell.

Clone the minimal Node / Express with TypeScript boilerplate. As the name suggests this is a minimal Node / Express app using TypeScript, so I won't get into details. You can clone or download the code here:

> https://github.com/oyalhi/typescript-node-express-minimal-boilerplate

After cloning or downloading, go into the project folder, install the dependencies and open your editor, here I'm using VS Code:

```bash
cd pick-from-dto
yarn install
code .
```

Let's run the boilerplate in watch mode by simply running the `watch` script which simply runs `nodemon` that uses the `nodemon.json` config file in the root of the folder:

```bash
yarn watch
```

If all went well, we should see the message that the server is listening on port 3000. We can exit the app and install the necessary libraries.

First we need to install the custom transformer, `ts-transformers-key`:

```bash
yarn add ts-transformer-key
```

Unfortunately, TypeScript itself does not currently provide an easy way to use custom transformers. But with the help of a custom library `ttypescript` (note the double 't') we can easily compile our code. Let's install the library:

```bash
yarn add ttypescript
```

We now need to add the following line to tsconfig.json to successfully compile our transformer:

```json
"plugins": [{ "transform": "ts-transformer-keys/transformer" }]
```

So the final version of `tsconfig.json` looks like this:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "esModuleInterop": true,
    "lib": ["es2015"],
    "module": "commonjs",
    "moduleResolution": "node",
    "noImplicitAny": true,
    "outDir": "dist",
    "paths": { "*": ["node_modules/*", "src/types/*"] },
    "plugins": [{ "transform": "ts-transformer-keys/transformer" }],
    "sourceMap": true,
    "target": "es6"
  },
  "include": ["src/**/*"]
}
```

Finally we need to tell `ts-node` to use the newly installed `ttypescript` compiler.

First update the `start` script in `package.json`:

```json
{
  "scripts": {
    "start": "ts-node -C ttypescript src/server.ts",
    ...
  }
}
```

Then we update the `nodemon.json`:

```json
{
  ...
  "exec": "ts-node -C ttypescript ./src/server.ts"
  ...
}
```

That's it, we've updated nodemon as well the `start` script. Just run `yarn start` or `yarn watch` and implement our approach to the code. If you are feeling lazy, you can find the final code here:

> https://github.com/oyalhi/update-using-dto

## Conclusion

Updating an object is a common scenario in a back end application. I wanted a solution that did not require a manual update of the code every time the requirements for an object has changed. Also, a solution that I can use in any project without rewriting the same boilerplate code.

We went through 4 solutions, each one improving the previous version. The first approach was buggy, had the possibility of changing our object. The second approach was too manual, required to assign each property manually. The third approach solved the problem; however was accepting illegal requests, though only using accepted keys. Our fourth and final approach rejected illegal requests for a rock solid approach.

I wanted to go one step further and create a generic function that could be used anywhere easily; however, we cannot use the `keys` dynamically and thus can't create a generic function. But for now, what we have should suffice.

I hope you liked it!
