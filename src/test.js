const ttt={a:3}
const fff={bb:ttt}
const d=new Proxy(fff,{
    get(){
        console.error(111)
    }
})
ttt.a=4