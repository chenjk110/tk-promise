import TKPromise from '../src/index'
const promiseAPlusTests = require('promises-aplus-tests')

describe('PromiseA+ Tests', () => {

    jest.setTimeout(0)

    const adapter = {
        deferred: function () {
            const result: any = {}
            result.promise = new TKPromise(function (reoslve, reject) {
                result.resolve = reoslve
                result.reject = reject
            })
            return result
        },
        resolved: TKPromise.resolve,
        rejected: TKPromise.reject
    }

    it('defaults', (done) => {
        jest.setTimeout(1000000)
        promiseAPlusTests(adapter, { reporter: 'spec' }, function (err: Error) {
            if (err) { throw err }
            done()
        });
    })

})

// const noop = () => { }

// describe('TKPromise static methods', () => {
//     it('all', () => {
//         expect(TKPromise.all).toBeTruthy
//         expect(TKPromise.all).toBeInstanceOf(Function)
//         expect(TKPromise.all.length).toEqual(1)
//         expect(TKPromise.all([])).toBeInstanceOf(TKPromise)
//     })

//     it('race', () => {
//         expect(TKPromise.race).toBeTruthy
//         expect(TKPromise.race).toBeInstanceOf(Function)
//         expect(TKPromise.race.length).toEqual(1)
//         expect(TKPromise.race([])).toBeInstanceOf(TKPromise)
//     })

//     it('allSettled', () => {
//         expect(TKPromise.allSettled).toBeTruthy
//         expect(TKPromise.allSettled).toBeInstanceOf(Function)
//         expect(TKPromise.allSettled.length).toEqual(1)
//         expect(TKPromise.allSettled([])).toBeInstanceOf(TKPromise)
//         expect(TKPromise.allSettled([])['state']).toBe('pendding')
//     })

//     it('resolve', () => {
//         expect(TKPromise.resolve).toBeTruthy
//         expect(TKPromise.resolve).toBeInstanceOf(Function)
//         expect(TKPromise.resolve.length).toEqual(1)
//         expect(TKPromise.resolve()).toBeInstanceOf(TKPromise)
//         expect(TKPromise.resolve(1)['value']).toBe(1)
//         expect(TKPromise.resolve()['state']).toBe('settled')
//     })

//     it('reject', () => {
//         expect(TKPromise.reject).toBeTruthy
//         expect(TKPromise.reject).toBeInstanceOf(Function)
//         expect(TKPromise.reject.length).toEqual(1)
//         expect(TKPromise.reject()).toBeInstanceOf(TKPromise)
//         expect(TKPromise.reject(1)['value']).toBe(1)
//         expect(TKPromise.reject()['state']).toBe('settled')
//     })
// })

// describe('TKPromise instance', () => {
//     it('instance of TKPromise', () => {
//         const p = new TKPromise(noop)
//         expect(p).toBeInstanceOf(TKPromise)
//         expect(p['state']).toBe('pendding')
//     })

//     it('private `handleResolve`', () => {
//         const p = new TKPromise(noop)
//         expect(p['handleResolve']).toBeInstanceOf(Function)
//         p['handleResolve']('abc')
//         expect(p['state']).toBe('settled')
//         expect(p['value']).toBe('abc')
//     })

//     it('validate `then` method', () => {
//         const p = new TKPromise(noop)
//         expect(p.then).toBeTruthy
//         expect(p.then).toBeInstanceOf(Function)
//     })

//     it('validate `then` method:resolve', () => {
//         const resolveValue = 1

//         const p1 = new TKPromise((resolve) => resolve(resolveValue))

//         const notExec = (res: any) => {
//             throw new Error('Error: should not executed.')
//         }

//         // resolve
//         p1.then((res) => {
//             expect(res).toEqual(resolveValue)
//         }, notExec).then((res) => {
//             expect(res).toEqual(resolveValue)
//         }, notExec)
//     })

//     it('validate `then` method:reject', () => {
//         const rejectValue = 1

//         const notExec = (res: any) => {
//             throw new Error('Error: should not executed.')
//         }

//         const p2 = new TKPromise((_, reject) => reject(rejectValue))

//         // reject
//         p2.then(notExec, (res) => {
//             expect(res).toEqual(rejectValue)
//         })
//             .then(notExec, (res) => {
//                 expect(res).toEqual(rejectValue)
//             })
//             .then(notExec, (res) => {
//                 expect(res).toEqual(rejectValue)
//             })
//     })

//     it('validate `catch` method', () => {
//         const p = new TKPromise(noop)
//         expect(p.catch).toBeTruthy
//         expect(p.catch).toBeInstanceOf(Function)
//     })

//     it('validate `finally` method', () => {
//         const p = new TKPromise(noop)
//         expect(p.finally).toBeTruthy
//         expect(p.catch).toBeInstanceOf(Function)
//     })
// })
