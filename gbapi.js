const request = require("request");

exports.fromTags = (tags,limit,pid) => {
	return new Promise((resolve,reject)=>
		request(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=${tags}&limit=${limit}&pid=${pid}&json=1`,
		 (err,res,body)=> err ? reject(err) : resolve(body)))
}