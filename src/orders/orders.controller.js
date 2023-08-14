const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
///////////////////
function list(req, res) {
  res.json({ data: orders });
}
///////////////////validators
function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order ${orderId} does not exist.`
  });
}
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if ((data[propertyName] && data[propertyName].length > 0) ||Number.isInteger(data[propertyName])) {
        res.locals.data = data
        next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}
function bodyDataHasDish(propertyName) {
  return function (req, res, next) {
    const data = res.locals.data
    if (
      (data[propertyName] && data[propertyName].length > 0)) {
      next();
    }else{
        next({ status: 400, message: `Order must include a dish` });
    }
  };
}
function bodyDataHasStatus(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    const validStatuses = ["pending", "preparing", "out-for-delivery", "delivered"];
    if (!data[propertyName] || data[propertyName].length <= 0 || !validStatuses.includes(data[propertyName])) {
      return next({
        status: 400,
        message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
      });
    }
    if (data[propertyName] === "delivered") {
      return next({
        status: 400,
        error: `A delivered order cannot be changed`,
      });
    }
    next();
  };
}
function statusIsPending(propertyName){
    return function (req, res, next) {
        const order = res.locals.order
        if(order.status === "pending"){
            return next()
        }else{
            return next({
                status:400,
                message: `An order cannot be deleted unless it is pending.`
            })    
        }
    }
}
function dishesIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (Array.isArray(dishes) && dishes.length > 0) {
    next();
  } else {
    return next({
      status: 400,
      message: `Order must include at least one dish`,
    });
  }
}
function dishQuantityIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    const quantity = dish.quantity;
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return next({
        status: 400,
        message: `Dish ${i} must have a quantity that is an integer greater than 0`,
      });
    }
  }
  next();
}
function bodyIdMatchesRouteId(req, res, next) {
  const { data: { id } } = req.body;
  const orderId = req.params.orderId;
  if (id === orderId || !id) {
    next();
  } else {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${orderId}, Route: ${id}`,
    });
  }
}

///////////////////
function create(req, res, next) {
  //make a new order
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const id = nextId();
  const newOrder = {
    id,
    deliverTo,
    mobileNumber,
    dishes: [...dishes],
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}
///////////////////
function read(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  res.json({ data: foundOrder });
}
///////////////////
function update(req, res) {
    const order = res.locals.order
      const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
    
      // Update the paste
      order.deliverTo = deliverTo;
      order.mobileNumber = mobileNumber;
      order.status = status;
      order.dishes = dishes;
    
      res.json({ data: order });
}
///////////////////
function destroy(req, res) {
    const { orderId } = req.params;
    const index = orders.findIndex((order) => order.id === orderId);
    // `splice()` returns an array of the deleted elements, even if it is one element
    if(index > -1){
        orders.splice(index, 1);
    }
    res.sendStatus(204);
}
///////////////////
module.exports = {
  list,
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHasDish("dishes"),
    dishesIsValid,
    dishQuantityIsValid,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyIdMatchesRouteId,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHasStatus("status"),
    bodyDataHasDish("dishes"),
    dishesIsValid,
    dishQuantityIsValid,
    update,
  ],
  delete:[orderExists, statusIsPending("status"), destroy]
};
