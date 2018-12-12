var user = await this.UserModel.findOne({ email: email});
if (user) {
  // reset user
  // checking for trial
  //console.info(user);
  // set trial if not on payment plan
  if (user.payment_plan_id == 0) {
    // if free trial has not started and free trial not expired then start free trial
    if (user.free_trial_start_date == null && !user.is_free_trial_expired) {
      var free_trial_start_date = Date.now();
      await user.set('free_trial_start_date',free_trial_start_date);
      await user.save();
    // if free trial has started and is not expired
    } else if (user.free_trial_start_date != null && !user.is_free_trial_expired) {
      if (user.free_trial_start_date != null) {
        var free_trial_expiration_date = new Date();
        var free_trial_start_date = new Date(user.free_trial_start_date)
        free_trial_expiration_date.setDate(free_trial_start_date.getDate() + 8);
        var date_now = Date.now();
        if (free_trial_expiration_date <= date_now ) {
          // free trial expired
          await user.set('is_free_trial_expired',true);
          await user.save();
        }
      }
    }
  } else if(user.payment_plan_id > 0) {
    if (user.plan_expiration_date != null) {
      var plan_expiration_date = new Date(user.plan_expiration_date);
      var date_now = Date.now();
      if (plan_expiration_date <= date_now ) {
        // plan expired
        await user.set('is_payment_plan_expired',true);
        await user.save();
      }
    }
  }
  const stripe_key = Config.stripe.secretKey;
  var stripe = require("stripe")(stripe_key);

  if (user.stripe_customer_id != null && user.stripe_customer_id != "") {
    let getCustomerSubscriptionOptions = {
        stripe_customer_id: user.stripe_customer_id
    }

    if (user.payment_plan_id > 0 && !user.is_payment_plan_expired) {
      var status = "inactive";
      var is_unable_to_get_customer_subscription = false;
      // get valid stripe
      var is_valid_stripe_customer = await is_valid_stripe_customer_id(user.stripe_customer_id);
      if (is_valid_stripe_customer) {
          var obj_subscription = await get_customer_subscription(user.stripe_customer_id);
          status = _.get(obj_subscription,"data[0].items.data[0].status","inactive");
          console.info('status is ' + status);
      } else {
        await user.set('stripe_customer_id','');
      }

      // check if user is active
      if (status != "active") {
        // payment plan expired
        await user.set('is_payment_plan_expired',true);
        await user.save();
      } else {
        //payment plan not expired
      }
    }
  }

