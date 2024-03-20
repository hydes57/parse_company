const Parse = require('template-parser')
const Utils = require('./untils')
const Config = require('./config')
const Api = require('./api')
const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')
const _ = require('colors')
const patternPublicId = /([^./]+).linkedin.com\/(?:showcase|company|school)\/([^/?#]+)/;


var template = {}

try {
    template = JSON.parse(fs.readFileSync('./template.json'))
} catch(e) {
    console.log("Cannot read template, either template contains errors or not exist...".red)
    process.exit(-1)
}

const proc = async (html,file) => {
    let cid = html.match(/\:organization\:(\d+)/)[1]
    console.log(cid)

      
    // parse
    let result = await Parse(template, html)


    addresses = result.locations_raw

    let value_location_raws = addresses.map(location => location.value.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim()) || "{}";


    result.scriptData = JSON.parse(result.hidden.value || "{}")
    
    let companyProfile = JSON.parse(JSON.stringify(result.details) || "{}") // copy details
    let fileName = file.replace('.html', '').split('___')
    // console.log(fileName[2])
    // companyProfile['public_id'] = fileName[0]
    // console.log(companyProfile['public_id'])
    // process.exit(0)
    companyProfile["cid"] = parseInt(cid)

    companyProfile["valueLocationRaws"] = value_location_raws.join(";")


    companyProfile["url"] = result.scriptData.url || ""
    
    // companyProfile["name"] = result.scriptData.name.replace(/\.html$/, '') || ""

    companyProfile["name"] = result.scriptData.name ?? file.replace(/^s\d+-\d+___\d+___/, '').replace(/\.html$/, '');

    if (companyProfile["name"] == "") throw new Error(`Company_Name not found ${file}`)

    // const match = patternPublicId.exec(companyProfile["url"]) || '';
    let match = [];
    if (patternPublicId.exec(companyProfile["url"])) {
        match = patternPublicId.exec(companyProfile["url"]);
    } else if (fileName[2]) {
        match[2] = fileName[2];
    } else {
        match[2] = '';
    }

    companyProfile["public_id"] = "";

    if (match && match.length >= 3) {
        companyProfile["public_id"] = match[2] || "";
    }

    if (match && match.length >= 3) {extractedPart = match[2];}

    Object.assign(companyProfile, result.scriptData.address || {})
    companyProfile["numberOfEmployees"] = result.scriptData.numberOfEmployees?.value || null
    companyProfile["slogan"] = result.scriptData.slogan || ""
    companyProfile["logo"] = result.scriptData.logo?.contentUrl || ""
    companyProfile["sameAs"] = result.scriptData.sameAs || ""




    if (result.followers?.value?.length > 0) {
        let m = result.followers?.value?.match(/\d+.+followers/);
        if (m && m.length > 0) {
            companyProfile["followers"] = m[0];
        } else {
            companyProfile["followers"] = "";
        }
    }
    return companyProfile
}

const save = async (profile, folderName, file) => {
    if (await Api.saveCompany(profile)) {
        console.log(`ok | ${profile["cid"]} | `.green + `${profile.name}`.yellow)
        await Utils.mv(path.join(Config.folderPath.src, file), path.join(`${Config.folderPath.done}/${folderName}`))
    } else {
        console.log(`fail to save | ${profile["cid"]} | ${profile.name}`.yellow)
        // process.exit(0)
        await Utils.mv(path.join(Config.folderPath.src, file), path.join(`${Config.folderPath.fail}/${folderName}`))
    }
}

const main = async () => {
    var files = fs.readdirSync(Config.folderPath.src)
    let date = new Date().toISOString().split('T')[0]
    console.log(`####################################################################################`.rainbow)
    console.log(`Scanning ${Config.folderPath.src}`.bgBlue)
    console.log(`${files.length} files were found!`.green)

    console.log(`Successes will be placed into ${Config.folderPath.done}\nAnd failed ones into ${Config.folderPath.fail}`.blue)

    let folderName = date

    await Utils.mkdir(`${Config.folderPath.done}/${folderName}`)
    await Utils.mkdir(`${Config.folderPath.fail}/${folderName}`)
    

    let worker = []
    for (const file of files) {
        if (worker.length > 200) {
            await Promise.all(worker)
        }
        worker.push(
            fsp.readFile(path.resolve(Config.folderPath.src, file), 'utf-8')
            .then(s => proc(s,file))
            .then(v => save(v, folderName, file))
            .catch(e => {console.log(e); Utils.mv(path.join(Config.folderPath.src, file), path.join(`${Config.folderPath.fail}/${folderName}`))})
            // .catch(e => process.exit(0))
            
        )
    }
    if (worker.length != 0) await Promise.all(worker)
    console.log(`Done scan!`.green)
}

const run = async() => {
    while(true) {
        await main()
        await Utils.sleep(3e5)
    }
}

run()