module.exports = {
    plugins: [require('autoprefixer'),
require('postcss-px2rem')({
    rootValue:37.5
})],
   }