const axios = require('axios')
const config = require('./config')

exports.saveCompany = async (data) => {
    try {
        await axios.post(config.baseUrl + 'company/', data)
        return true
    } catch (e) {
        console.log(e)
        return false
    } 
}