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
    console.log($('.day'));
    $('.day').each(function(){
      var cooks_today = Cooks.find({day:$(this).attr('id')}).count();
      var opacity = 0.9 - cooks_today * 0.2;
      $(this).animate({opacity:opacity}, 400);
    });
  }
  
  Meteor.startup(function(){
    setTimeout(function(){
      update_background();
      $('.week').css("opacity", 1);
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
      return (cook1._id === cook2._id);
  }
  
  Template.week.days = function() {
    return Days.find({});
  }
  
  Template.week.update_background = update_background;
  
  Template.day.make_droppable = function(){
    Meteor.defer(function(){
      $('.drop_target').droppable({
        
        //Only accept cooks if there isn't a cook or if it's the cook in this position.
        accept:function(dropElem) {
          var day = $(this).parent().attr("id");
          var position = $(this).attr("data-position");
          var currentCook = Cooks.findOne({day:day, position:position});
          var thisCook = Cooks.findOne({id:$(this).attr("data-cook-id")});
          return ((!currentCook) || areTheSame(thisCook, currentCook));
        },
        
        //Update the dropped cook's model to reflect his/her place here. 
        drop:function(event, ui) {
          var day = $(this).parent().attr("id");
          var position = $(this).attr("data-position");
          var thisCook = Cooks.findOne({_id:ui.draggable.children().attr("data-cook-id")});
          Cooks.update(thisCook, {$set:{day:day, position:position}});
          update_background();
        },
        
        //If the current cook leaves, update his or her model to reflect the change. 
        out:function(event, ui) {
          var day = $(this).parent().attr("id");
          var position = $(this).attr("data-position");
          console.log("In "+day+" position "+position);
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
  
  Template.loose_cooks.loose_cooks = function() {
    return Cooks.find({top:null});
  }
  Template.loose_cook.make_draggable = function() {
    Meteor.defer(function(){
      $(".loose_cook").draggable({
        //revert:'invalid', 
        snap:'.drop_target',
        snapMode:'inner',
        snapTolerance:80,
        stop: function(event, ui) {
          console.log(this);
          thisCook = Cooks.findOne({_id:$(this).children().attr("data-cook-id")});
          Cooks.update(thisCook, {$set:{top:$(this).css("top"), left:$(this).css("left")}});
          console.log("Updating cook:");
          console.log(thisCook);
          
        }
      });
    });
  }
  Template.bound_cooks.bound_cooks = function() {
    return Cooks.find({top:{$ne:null}});
  }
  Template.bound_cook.make_draggable = function() {
    Meteor.defer(function(){
      $(".bound_cook").draggable({
        //revert:'invalid', 
        snap:'.drop_target',
        snapMode:'inner',
        snapTolerance:80,
        stop: function(event, ui) {
          console.log(this);
          thisCook = Cooks.findOne({_id:$(this).children().attr("data-cook-id")});
          Cooks.update(thisCook, {$set:{top:$(this).css("top"), left:$(this).css("left")}});
          console.log("Updating cook:");
          console.log(thisCook);
          console.log("Setting position");
          $cook = $('[data-cook-id|=' + thisCook._id + ']');
          $cook.parent().css('top', "" + thisCook.top + "px");
          $cook.parent().css('left', "" + thisCook.left + "px");
        }
      });
    });
  }
  
// Controls template
// -----------------
  Template.controls.events = {
    "click #add_cook" : function() {
      Cooks.insert({ name:$("#new_cook_name").val() });
      $("#new_cook_name").val("");
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