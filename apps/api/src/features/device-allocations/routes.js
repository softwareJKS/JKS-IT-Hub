import { requireAuthenticated } from "../../shared/auth/requireAuthenticated.js";
import { createProblemDetails, sendProblem } from "../../shared/errors/problemDetails.js";
import {
  createPolicySchema,
  updatePolicySchema,
  createTierSchema,
  updateTierSchema,
  upsertDepartmentQuotaSchema,
  createSlotSchema,
  updateSlotSchema,
  listSlotsQuerySchema
} from "./schema.js";

const formatValidationIssues = (validation) => {
  return validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
};

const handleRouteError = (error, reply) => {
  if (error?.statusCode === 404) {
    sendProblem(
      reply,
      createProblemDetails({
        status: 404,
        title: "Not Found",
        detail: error.message
      })
    );
    return;
  }
  if (error?.statusCode === 400 || error?.code === "P2002") {
    sendProblem(
      reply,
      createProblemDetails({
        status: 400,
        title: "Invalid Input",
        detail: error.message || "A unique constraint was violated"
      })
    );
    return;
  }
  sendProblem(
    reply,
    createProblemDetails({
      status: 500,
      title: "Internal Server Error",
      detail: error.message || "An unexpected error occurred"
    })
  );
};

export default async function deviceAllocationsRoutes(fastify, options) {
  const { config, userRepo, service } = options;

  // ==================== SUMMARY & RECONCILIATION ====================

  fastify.get("/summary", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;
    try {
      const { policyId } = request.query || {};
      const data = await service.getSummary(policyId);
      reply.send({ data });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.get("/reconciliation", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;
    try {
      const { policyId } = request.query || {};
      const data = await service.getDepartmentReconciliation(policyId);
      reply.send({ data });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  // ==================== SLOTS ====================

  fastify.get("/slots", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = listSlotsQuerySchema.safeParse(request.query || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const { page, perPage, ...filters } = validation.data;
      const result = await service.listSlots(filters, { page, perPage });
      reply.send(result);
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.post("/slots", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = createSlotSchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const slot = await service.createSlot(validation.data, actor);
      reply.status(201).send({ data: slot });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.put("/slots/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = updateSlotSchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const slot = await service.updateSlot(request.params.id, validation.data, actor);
      reply.send({ data: slot });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.delete("/slots/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    try {
      await service.deleteSlot(request.params.id);
      reply.send({ success: true });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.post("/slots/:id/auto-match", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    try {
      const result = await service.autoMatchSlot(request.params.id);
      reply.send({ data: result });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  // ==================== TIERS ====================

  fastify.get("/tiers", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;
    try {
      const tiers = await service.listTiers();
      reply.send({ data: tiers });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.post("/tiers", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = createTierSchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const tier = await service.createTier(validation.data);
      reply.status(201).send({ data: tier });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.put("/tiers/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = updateTierSchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const tier = await service.updateTier(request.params.id, validation.data);
      reply.send({ data: tier });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.delete("/tiers/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    try {
      await service.deleteTier(request.params.id);
      reply.send({ success: true });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  // ==================== POLICIES ====================

  fastify.get("/policies", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;
    try {
      const policies = await service.listPolicies();
      reply.send({ data: policies });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.post("/policies", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = createPolicySchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const policy = await service.createPolicy(validation.data);
      reply.status(201).send({ data: policy });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.put("/policies/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = updatePolicySchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const policy = await service.updatePolicy(request.params.id, validation.data);
      reply.send({ data: policy });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.delete("/policies/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    try {
      await service.deletePolicy(request.params.id);
      reply.send({ success: true });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  // ==================== DEPARTMENTS & QUOTAS ====================

  fastify.get("/departments", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;
    try {
      const hierarchy = await service.listDepartments();
      reply.send({ data: hierarchy });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.post("/department-quotas", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    const validation = upsertDepartmentQuotaSchema.safeParse(request.body || {});
    if (!validation.success) {
      sendProblem(
        reply,
        createProblemDetails({
          status: 400,
          title: "Invalid Input",
          detail: formatValidationIssues(validation)
        })
      );
      return;
    }

    try {
      const quota = await service.upsertDepartmentQuota(validation.data);
      reply.send({ data: quota });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });

  fastify.delete("/department-quotas/:id", async (request, reply) => {
    const actor = await requireAuthenticated(request, reply, { config, userRepo });
    if (!actor) return;

    try {
      await service.deleteDepartmentQuota(request.params.id);
      reply.send({ success: true });
    } catch (err) {
      handleRouteError(err, reply);
    }
  });
}
