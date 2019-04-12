const { authorize } = require("../../../lib");
const policies = require("./policies");
const { Role, User, Article } = require("./models");
const { decodeAuthToken } = require("./utils");

module.exports = {
  /**
   * This middleware just sets the req.context to an empty object. req.context is
   * used to add our custom request values to avoid polluting or accidentally
   * overriding important req object values.
   *
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  init: (req, res, next) => {
    req.context = {};
    return next();
  },

  /**
   * This middleware identifies the user making the request via the
   * authorization header. If it is not able to authenticate the
   * user it returns a 401 error response. Else, it adds the
   * user object to the req object to make it available to
   * all other consequent handlers.
   *
   * @param req
   * @param res
   * @param next
   * @returns {Promise<*>}
   */
  authenticate: async (req, res, next) => {
    // if the route is not protected proceed to the next handler
    if (req.url === "/" || req.url === "/auth/login") return next();
    // If this were session based auth system we would be verifying the
    // username/email and password combination against the session
    // in this step.
    try {
      const { username } = decodeAuthToken(req);
      // Adding the user object to the request object so that all proceeding
      // handlers e.g. authorize middleware will know the authenticated
      // user.
      req.user = await User.findOne({ username });
      return next();
    } catch (e) {
      return res.status(401).json({
        message: "Sorry :( Log in and try again."
      });
    }
  },

  /**
   * This middleware returns a middleware function that is able to authorize
   * the action that the user is trying to make on a given entity. If the
   * user is not allowed to perform the action it returns a 403 error
   * response. Else, it allows the request to proceed by calling the
   * next handler.
   *
   * @param action
   * @param entity
   * @returns {Function}
   */
  can: (action, entity) => {
    return async (req, res, next) => {
      try {
        // If any of your policies use the express req object you must pass it.
        // The req parameter is optional.
        const userPermissions = await req.user.permissions;
        if (!authorize(action, entity, userPermissions, policies, req)) {
          return res.status(403).json({
            message: `You are not authorized to perform this action.`
          });
        }
        return next();
      } catch (e) {
        // eslint-disable-next-line
        console.log(e);
        // two exceptions are possible: missing policy or missing policy action
        return res.status(500).json({
          message: "Sorry :( Something bad happened."
        });
      }
    };
  },

  /**
   * This middleware checks whether the article whose id is passed as a
   * parameter on the request exits. If it does not exist it returns a
   * 404 error response. Else, it adds the article object to the
   * req.context object and calls the next handler.
   *
   * @param req
   * @param res
   * @param next
   * @returns {Promise<*>}
   */
  processArticleParam: async (req, res, next) => {
    try {
      const { id } = req.params;
      req.context.article = await Article.findOne({ _id: id })
        .populate("owner", "-password")
        .orFail();
      return next();
    } catch (e) {
      return res.status(404).json({
        message: "The article does not exist."
      });
    }
  },

  /**
   * This middleware checks whether the role whose id is passed as a
   * parameter on the request exits. If it does not exist it returns a
   * 404 error response. Else, it adds the role object to the
   * req.context object and calls the next handler.
   *
   * @param req
   * @param res
   * @param next
   * @returns {Promise<*>}
   */
  processRoleParam: async (req, res, next) => {
    try {
      const { id } = req.params;
      req.context.role = await Role.findOne({ _id: id }).orFail();
      return next();
    } catch (e) {
      return res.status(404).json({
        message: "The role does not exist."
      });
    }
  },

  /**
   * This middleware checks whether the user whose id is passed as a
   * parameter on the request exits. If it does not exist it returns a
   * 404 error response. Else, it adds the role object to the
   * req.context object and calls the next handler.
   *
   * @param req
   * @param res
   * @param next
   * @returns {Promise<*>}
   */
  processUserParam: async (req, res, next) => {
    try {
      const { id } = req.params;
      req.context.user = await User.findOne({ _id: id })
        .populate("roles")
        .orFail();
      return next();
    } catch (e) {
      return res.status(404).json({
        message: "The user does not exist."
      });
    }
  }
};