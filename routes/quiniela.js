var express = require('express');
var router = express.Router();
var pool = require('../database');
var mysql = require('mysql');

/* GET user dashboard page */
router.get('/', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  var anchor = req.query.match;
  // Get participants
  pool.getConnection(function(err, con) {
    console.log(pool._allConnections.length);
    if(err) throw err;
    
    sql = "SELECT username, IFNULL(SUM(b.points), 0) points FROM user u JOIN quiniela q ON u.quiniela_id = q.code LEFT JOIN bet b ON b.user = u.user_id WHERE q.code = " + mysql.escape(req.session.quiniela) + " GROUP BY u.username ORDER BY points DESC";
    con.query(sql, function(err, result) {
      sql = "SELECT IFNULL(SUM(b.points), 0) AS points FROM user u LEFT JOIN bet b ON u.user_id = b.user WHERE u.user_id=" + mysql.escape(req.session.uid);
      con.query(sql, function(err, points) {
        con.release();
        res.render('Quiniela/dashboard', {username: req.session.username, background: req.session.background, event: req.session.event, competitors: result, points: points[0].points, match: anchor});
        if(err) throw err;
      });
    });
  });
});

/* GET user dashboard knockout page */
router.get('/knockout', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  var anchor = req.query.match;
  // Get participants
  pool.getConnection(function(err, con) {
    console.log(pool._allConnections.length);
    if(err) throw err;
    sql = "SELECT username, IFNULL(SUM(b.points), 0) points FROM user u JOIN quiniela q ON u.quiniela_id = q.code LEFT JOIN bet b ON b.user = u.user_id WHERE q.code = " + mysql.escape(req.session.quiniela) + " GROUP BY u.username ORDER BY points DESC";
    con.query(sql, function(err, result) {
      sql = "SELECT IFNULL(SUM(b.points), 0) AS points FROM user u LEFT JOIN bet b ON u.user_id = b.user WHERE u.user_id=" + mysql.escape(req.session.uid);
      con.query(sql, function(err, points) {
        con.release();
        res.render('Quiniela/knockout', {username: req.session.username, background: req.session.background, event: req.session.event, competitors: result, points: points[0].points, match: anchor});
        if(err) throw err;
      });
      
    });
  });
});

/* GET user dashboard groups page */
router.get('/groups', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  // Get participants
  pool.getConnection(function(err, con) {
    console.log(pool._allConnections.length);
    if(err) throw err;
    sql = "SELECT username, IFNULL(SUM(b.points), 0) points FROM user u JOIN quiniela q ON u.quiniela_id = q.code LEFT JOIN bet b ON b.user = u.user_id WHERE q.code = " + mysql.escape(req.session.quiniela) + " GROUP BY u.username ORDER BY points DESC";
    con.query(sql, function(err, result) {
      sql = "SELECT IFNULL(SUM(b.points), 0) AS points FROM user u LEFT JOIN bet b ON u.user_id = b.user WHERE u.user_id=" + mysql.escape(req.session.uid);
      con.query(sql, function(err, points) {
        con.release();
        res.render('Quiniela/groups', {username: req.session.username, background: req.session.background, event: req.session.event, competitors: result, points: points[0].points});
        if(err) throw err;
      });
      
    });
  });
});

/* GET quiniela from other participants */
router.get('/users/:uname', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  // Get participant
  var participant_name = req.params.uname;
  pool.getConnection(function(err, con) {
    console.log(pool._allConnections.length);
    if(err) throw err;
    sql = "SELECT user_id FROM user WHERE username = " + mysql.escape(participant_name);
    con.query(sql, function(err, result) {
      con.release();
      if(result.length > 0){
        res.render('Quiniela/participant', {background: req.session.background, username: participant_name, uid: result[0].user_id});
      }else{
        res.redirect('/notfound');
      }
      if(err) throw err;
    });
  });
});

/* GET master account content */
router.get('/master', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || !req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  pool.getConnection(function(err, con) {
    if(err) throw err;
    sql = `SELECT m.match_id, h.name home, h.flag home_flag, a.name away, a.flag away_flag 
    FROM matches m JOIN team h ON m.home_team = h.code JOIN team a ON m.away_team = a.code 
    WHERE m.match_status = 0 ORDER BY m.match_date;`;
    con.query(sql, function(err, result) {
      var matches = result;
      sql = "SELECT t.match_type_id, t.name FROM match_type t WHERE t.active = 1;";
      con.query(sql, function(err, result) {
        var type = result;
        con.release();
        if(err) throw err;
        res.render('Quiniela/master', {username: req.session.username, matches: matches, deactivate: type});
      });
    });
  });
});

router.post('/uMatch', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || !req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  var match_id = parseInt(req.body.match);
  var home_goals = parseInt(req.body.hg);
  var away_goals = parseInt(req.body.ag);
  var result = (home_goals > away_goals)? 1: (home_goals < away_goals)? 2: 0;
  pool.getConnection(function(err, con) {
    if(err) throw err;
    sql="UPDATE matches SET local_goals ="+mysql.escape(home_goals)+", away_goals="+mysql.escape(away_goals)+", result_id="+mysql.escape(result)+", match_status = 1 WHERE match_id="+mysql.escape(match_id);
    con.query(sql, function(err, result) {
      con.release();
      if(err) throw err;
      res.redirect('back');
    });
  });
});

router.post('/dMatches', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated || !req.session.master){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  var type_id = parseInt(req.body.deactivate);
  pool.getConnection(function(err, con) {
    if(err) throw err;
    sql = "UPDATE match_type SET active=0 WHERE match_type_id = " + mysql.escape(type_id);
    con.query(sql, function(err, result) {
      con.release();
      if(err) throw err;
      res.redirect('back');
    });
  });
});

/* GET LOGOUT */
router.get('/logout', function(req, res, next) {
  // Handle unauthorized access
  if(!req.session || !req.session.authenticated){
    res.status(403);
    req.flash('msg', 'Por favor inicia sesión antes de continuar');
    res.redirect('/login');
    return;
  }
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;