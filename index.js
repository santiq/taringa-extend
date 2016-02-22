'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var request = require('request');
var _ = require('lodash');

var mongojs = require('mongojs');
var databaseUrl = " USERNAME: SECRET @ URL";
var db = mongojs(databaseUrl);
var shouts = db.collection('shouts')

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get('/',(req, res) => {
   res.json('Denunciado Lince!');
})

app.get('/get-votes',getVotes);

app.post('/vote',addVote);

function getVotes(req,res){
	
	let shout_id = req.query.shout_id || '';

	shouts.findOne({shout_id:shout_id},(err,result)=>{
		res.json(result);
	})
}

function addVote(req,res){ 
	
	if(!req.body.shout_id || !req.body.user_id || !req.body.nick || !req.body.avatarUrl ){

		res.json({code:400,  message:'missing-parameters'});

		return;
	}

	let shout_id = req.body.shout_id;
	let user={
		user_id: req.body.user_id,
		nick:req.body.nick,
		avatarUrl:req.body.avatarUrl,
		date:Date.now()
	}

	request.get('http://api.taringa.net/user/view/'+user.user_id,(err,response,body)=>{

		
		if(JSON.parse(body).code === 404){
			res.json({code:404,  message:'user-not-found' });
			return;
		}

		shouts.findOne({shout_id:shout_id},(err,result)=>{
				
			if(_.isEmpty(result)){
				shouts.insert({shout_id:shout_id,count:1,voters:[user]},(err,object)=>{
					res.json({code:200,  message:'vote added' });
					return;
				});
			}else if(result && _.includes(_.map(result.voters,'user_id'),user.user_id)){
				
				res.json({code:403,  message:'already-voted' });

				return;
			}else{

				shouts.update({shout_id:shout_id},{$inc:{count:1},$push:{voters:user}},(err,object)=>{
				if(err){
					res.json(err);
					return;
				}
				res.json({code:200,  message:'vote added' });
					return;		
				});	
			}
		})	
	})
}

var port = process.env.PORT || 3000;
var server = app.listen(port,() => {
	console.log("Server Up");
})
