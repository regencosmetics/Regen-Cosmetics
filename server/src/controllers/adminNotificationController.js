import {
  AdminReadState,
  Message,
  NewsletterSubscriber,
  Order,
  Refund,
  Return,
  User,
  Review,
} from "../models/index.js";

import { asyncHandler, ok } from "../utils/helpers.js";

const sections = [
  "orders",
  "returns",
  "refunds",
  "customers",
  "reviews",
  "messages",
  "newsletter",
];

export const getUnreadCounts = asyncHandler(async (_req, res) => {
  const readStates = await AdminReadState.find({}).lean();
  const lastViewedMap = {};

  readStates.forEach((state) => {
    lastViewedMap[state.section] = state.lastViewedAt;
  });

  const defaultDate = new Date(0);

  const afterLastView = (section, filter = {}) => {
    return {
      ...filter,
      createdAt: {
        $gt: lastViewedMap[section] || defaultDate,
      },
    };
  };

  const orders = await Order.countDocuments(afterLastView("orders"));
  const returns = await Return.countDocuments(afterLastView("returns"));
  const refunds = await Refund.countDocuments(afterLastView("refunds"));

  const customers = await User.countDocuments(
    afterLastView("customers", { role: "customer" }),
  );

  const reviews = await Review.countDocuments(
    afterLastView("reviews", { isSample: false }),
  );

  const messages = await Message.countDocuments(
    afterLastView("messages", { isRead: false }),
  );

  const newsletter = await NewsletterSubscriber.countDocuments(
    afterLastView("newsletter", { status: "subscribed" }),
  );

  return ok(res, {
    orders,
    returns,
    refunds,
    customers,
    reviews,
    messages,
    newsletter,
  });
});

export const markSectionAsRead = asyncHandler(async (req, res) => {
  const section = req.params.section;

  if (!sections.includes(section)) {
    return res.status(400).json({
      success: false,
      message: "Invalid section name",
    });
  }

  const updatedState = await AdminReadState.findOneAndUpdate(
    { section },
    {
      $set: {
        lastViewedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return ok(res, {
    section: updatedState.section,
    lastViewedAt: updatedState.lastViewedAt,
  });
});
