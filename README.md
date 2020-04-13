# TKPromise

-   `version: 0.2.0`
-   `update: 2020.4`

A promise library that implements Promise A+ standard and ES standard.

Reference: [Promise A+](https://promisesaplus.com/)
Reference: [ECMA-262](https://www.ecma-international.org/publications/standards/Ecma-262.htm)

```ts
type OnFulfilled = (result?: any) => any
type OnRejected = (result?: any) => any
type ExecutorFn = (resolve: OnFulfilled, reject: OnRejected) => void
```

## 1. Constructor

```ts
constructor(executor: ExecutorFn)
```

## 2. Static Methods

```ts
TKPromise.race(promises: TKPromise[]): TKPromise
```

```ts
TKPromise.all(promises: TKPromise[]): TKPromise
```

```ts
TKPromise.resolve(value?: any): TKPromise
```

```ts
TKPromise.reject(value?: any): TKPromise
```

```ts
TKPromise.allSettled(promises: TKPromise[]): TKPromise
```

## 3. Prototype Methods

```ts
.then(onFulfilld: OnFulfilled, onRejected?: OnRejected): TKPromise
```

```ts
.catch(onRejected: OnRejected): TKPromise
```

```ts
.finally(onFinally: (res?: any) => void): void
```

## Examples

```js
const p1 = new TKPromise((reoslve, reject) => {
    setTimeout(() => {
        resolve(10)
    }, 1000)
})
```

```js
TKPromise.race([TKPromise.resolve(1), TKPromise.resolve(2)]).then((values) => {
    console.log(values) // [1]
})
```

```js
TKPromise.all([TKPromise.resolve(1), TKPromise.resolve(2)]).then((values) => {
    console.log(values) // [1, 2]
})
```

```js
TKPromise.resolve(1)
    .then((res) => {
        console.log(res) // 1
        return TKPromise.resolve(2)
    })
    .then((res) => {
        console.log(res) // 2
    })
```

```js
TKPromise.reject(2).catch((res) => {
    console.log(res) // 2
})
```

```js
/* then, catch */

const p = new TKPromise((resolve, reject) => {
    setTimeout(() => {
        resolve('Hello World')
    }, 1000)
})

p.then((res) => {
    console.log(res) // 'Hello World'
    return new TKPromise((resolve, reject) => {
        setTimeout(() => {
            reject('Boom!!!')
        }, 1000)
    })
})
    .then((res) => {
        console.log(res) // noop
    })
    .then((res) => {
        console.log(res) // noop
    })
    .catch((err) => {
        console.log(err) // 'Boom!!!'
    })
```

```js
/* allSettled */

TKPromise.allSettled([
    TKPromise.resolve(1),
    TKPromise.resolve(2),
    TKPromise.reject(3),
]).then((result) => {
    console.log(result) // [1,2, 3]
})
```

```js
/* finally */
new TKPromise((resolve, reject) => {
    setTimeout(() => {
        resolve(1)
    }, 1000)
}).then((res) => {
    console.log(res) // 1
}).then((res) => {
    console.log(res) // Promise<resolved:undefined>
    return Promise.reject(2)
}).catch(err => {
    console.log(err) // 2
}).finally(() => {
    console.log('done!')
})

```