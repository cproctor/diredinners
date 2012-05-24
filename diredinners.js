//Next things to do:
//Record the cook's position. When new cook data comes down the line, set all the cooks to their positions. 
//Separate placed cooks from unplaced cooks. Placed cooks should have absolute positioning; unplaced cooks 
//should not.
//positioning help: http://www.west-wind.com/weblog/posts/2008/Oct/21/Making-Element-Position-Absolute-with-jQuery


// Both the server and the client create these collections.
// {name:"Monday", letter:"M", sequence:1}
Days = new Meteor.Collection("days");
// {name:"Chris", day:"Monday", position:1}
Cooks = new Meteor.Collection("cooks");


//
// CLIENT CODE
//

if (Meteor.is_client) {
  
  var update_background = function(){
    console.log("Updating background.");
    $('.day-mask').each(function(){
      var cooks_today = Cooks.find({day:$(this).attr('data-day')}).count();
      var opacity = 0.9 - cooks_today * 0.2;
      $(this).animate({opacity:opacity}, 400);
    });
  }
  
  Meteor.startup(function(){
    //I can't find any hook for when the days have loaded...
    setTimeout(function(){
      update_background();
      $('.week-mask').css("opacity", 1);
    }, 500);
  });
  
  // Receive updates to cook status and update day backgrounds accordingly.
  Meteor.subscribe('loose_cooks');
  Meteor.subscribe('bound_cooks');
  Meteor.subscribe('days');
  
  var areTheSame = function(cook1, cook2) {
    if (!(cook1 && cook2))
      return false;
    else
      return (cook1._id == cook2._id);
  }
  
  Template.week.days = function() {
    return Days.find({});
  }
  
  Template.day.make_droppable = function(){
    Meteor.defer(function(){
      $('.drop_target').droppable({
        
        //Only accept cooks if there isn't a cook or if it's the cook in this position.
        accept:function(dropElem) {
          var day = $(this).parent().attr("data-day");
          var position = $(this).attr("data-position");
          var currentCook = Cooks.findOne({day:day, position:position});
          var thisCook = Cooks.findOne({id:$(this).attr("data-cook-id")});
          return ((!currentCook) || areTheSame(thisCook, currentCook));
        },
        
        //Update the dropped cook's model to reflect his/her place here. 
        drop:function(event, ui) {
          var day = $(this).parent().attr("data-day");
          var position = $(this).attr("data-position");
          var thisCook = Cooks.findOne({_id:ui.draggable.children().attr("data-cook-id")});
          Cooks.update(thisCook, {$set:{day:day, position:position}});
          update_background();
        },
        
        //If the current cook leaves, update his or her model to reflect the change. 
        out:function(event, ui) {
          var day = $(this).parent().attr("data-day");
          var position = $(this).attr("data-position");
          var currentCook = Cooks.findOne({day:day, position:position});
          var thisCook = Cooks.findOne({id:ui.draggable.children().attr("data-cook-id")});
          if (areTheSame(thisCook, currentCook)) {
            Cooks.update(thisCook, {$set:{day:null, position:null}});
            update_background();
          }
        }
      });
    });
  } 
  
  Template.day.bound_cooks = function(day, position) {
    return Cooks.find({day:day, position:position});
  }
  
  Template.loose_cooks.loose_cooks = function() {
    return Cooks.find({day:null});
  }
  
  Template.loose_cooks.make_droppable = function() {
    Meteor.defer(function(){
      $("#loose_cooks").droppable({
        accept:function(){return true;},
        drop:function(event, ui) {
          console.log("Dropped over Loose Cooks");
          var thisCook = Cooks.findOne({_id:ui.draggable.children().attr("data-cook-id")});
          console.log(thisCook);
          Cooks.update(thisCook._id, {day:null, position:null, name:thisCook.name});
          update_background();
        }
      });
    });
  }
  
  Template.loose_cook.make_draggable = function() {
    Meteor.defer(function(){
      $(".loose_cook").draggable({
        revert:'invalid', 
        snap:'.drop_target',
        snapMode:'inner',
        snapTolerance:40
      });
    });
  }
  Template.bound_cook.make_draggable = function() {
    Meteor.defer(function(){
      $(".bound_cook").draggable({
        revert:'invalid', 
        snap:'.drop_target',
        snapMode:'inner',
        snapTolerance:40
      });
    });
  }
  
  Template.bound_cook.update_background = update_background;
  
  Template.controls.enable_controls = function() {
    Meteor.defer(function(){
      console.log("Enabling controls.");
      console.log( $('#remove_cook'));
      $('#remove_cook').droppable({
        accept:function(){return true;},
        drop:function(event, ui) {
          var thisCook = Cooks.findOne({_id:ui.draggable.children().attr("data-cook-id")});
          Cooks.remove(thisCook);
          $(this).animate({"background-color":"#555"}, 200);
        },
        over:function() {
          $(this).animate({"background-color":"#800"}, 200);
        },
        out:function() {
          $(this).animate({"background-color":"#555"}, 200);
        }
      });
    });
  }
  
// Controls template
// -----------------
  Template.controls.events = {
    "mouseover #add_cook" : function() {
      //Go into editing mode
      $("#add_cook").animate({"background-color":"#080"}, 200);
      $("#plus").hide();
      $("#new_cook_name").show().focus();
    },
    "keyup #new_cook_name" : function(evt) {
      //Enter
      if (evt.which === 13 && $("#new_cook_name").val()) {
        Cooks.insert({ name:$("#new_cook_name").val() });
        $("#new_cook_name").val("");
        $("#plus").show();
        $("#new_cook_name").hide();
        $("#add_cook").animate({"background-color":"#555"}, 200);
      }
    },
    "keydown #new_cook_name" : function(evt) {
      //Cancel
      if (evt.which === 27) {
        $("#new_cook_name").val("");
        $("#plus").show();
        $("#new_cook_name").hide();
        $("#add_cook").animate({"background-color":"#555"}, 200);
      }
    }
  }
}

//
// SERVER CODE
// 

if (Meteor.is_server) {
  Meteor.publish('loose_cooks', function() {
    return Cooks.find({top:null});
  });
  
  Meteor.publish('bound_cooks', function() {
    return Cooks.find({top:{$ne:null}})
  })
  
  Meteor.publish('days', function() {
    return Days.find({});
  })
  
  Meteor.startup(function () {
    if (Days.find().count() === 0) {
      var day_names = ["Monday","Tuesday","Wednesday","Thursday"];
      for (var i = 0; i < day_names.length; i++)
        Days.insert({name: day_names[i], letter: day_names[i].charAt(0), sequence: i});
    }
  });
}