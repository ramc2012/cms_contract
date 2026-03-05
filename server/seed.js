/* global process */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import {
  CalibrationStatus,
  Division,
  PrismaClient,
  Priority,
  Role,
  WorkOrderStatus,
  WorkRequestStatus,
  WorkingStatus,
} from "@prisma/client";

dotenv.config();

const DEFAULT_SERVICES = [
  "Gas Flow Metering",
  "Pressure Monitoring",
  "Temperature Measurement",
  "Custody Transfer",
  "Level Measurement",
  "SCADA Telemetry",
  "Safety Instrumented",
  "Gas Detection",
  "Drilling Param Monitor",
  "Mud Logging",
  "Well Head Monitor",
  "BOP Instrumentation",
];

const DEFAULT_CONTRACT_PERSONNEL = [
  ["CMS-001", "Rajesh Kumar", "Project Coordinator", "Overall Coordination"],
  ["CMS-002", "Suresh Patel", "Sr. Instrument Technician", "Flow Meters / SCADA"],
  ["CMS-003", "Amit Shah", "Instrument Technician", "Pressure & Temperature"],
  ["CMS-004", "Vikram Singh", "Field Infocom Engineer", "RTU / SCADA Systems"],
  ["CMS-005", "Pradeep Yadav", "Instrument Technician", "CTM Meters"],
  ["CMS-006", "Kiran Desai", "Jr. Technician", "General Instrumentation"],
  ["CMS-007", "Manish Joshi", "IT Support Engineer", "Field Infocom Systems"],
  ["CMS-008", "Ravi Sharma", "Instrument Technician", "Flow Meters"],
  ["CMS-009", "Dinesh Verma", "SCADA Technician", "SCADA / DCS"],
  ["CMS-010", "Arun Patil", "Telecom Technician", "Field Infocom / Telecom"],
];

const DEFAULT_ONGC_PERSONNEL = [
  ["ONGC-001", "Prakash Singh", "SE(Elex)", "singh_prakash@ongc.co.in"],
  ["ONGC-002", "M.K. Gautam", "GM(IT)", "mk.gautam@ongc.co.in"],
  ["ONGC-003", "Anita Verma", "EE(Instrumentation)", "anita.verma@ongc.co.in"],
  ["ONGC-004", "Sanjay Rao", "AEE(Instrumentation)", "sanjay.rao@ongc.co.in"],
];

const DEFAULT_MANAGERS = [
  ["MGR-AREA-01", "Area 01 Manager", "manager01@ongc.co.in", "AREA 01"],
  ["MGR-AREA-02", "Area 02 Manager", "manager02@ongc.co.in", "AREA 02"],
  ["MGR-AREA-03", "Area 03 Manager", "manager03@ongc.co.in", "AREA 03"],
  ["MGR-AREA-04", "Area 04 Manager", "manager04@ongc.co.in", "AREA 04"],
];

const DRILLING_KEYWORDS = [
  "RIG SITE",
  "MUD LOGGING",
  "DRILLING INFOCOM",
  "DRILLING",
  "RIG",
  "LAB",
];

function normalizeArea(areaText) {
  if (!areaText) return "AREA 01";
  const text = String(areaText).toUpperCase().replace(/\s+/g, " ").trim();
  const match = text.match(/AREA\s*[-]?\s*([0-9]{1,2}|I{1,3}|IV)/);
  if (!match) {
    return text.startsWith("AREA") ? text.replace("-", " ") : "AREA 01";
  }

  const raw = match[1];
  if (/^[0-9]+$/.test(raw)) {
    return `AREA ${String(Number(raw)).padStart(2, "0")}`;
  }

  const romanMap = { I: 1, II: 2, III: 3, IV: 4 };
  const value = romanMap[raw] || 1;
  return `AREA ${String(value).padStart(2, "0")}`;
}

function normalizeName(value) {
  if (!value) return "";
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .trim();
}

function inferDivision(name) {
  const value = normalizeName(name).toUpperCase();
  if (DRILLING_KEYWORDS.some((keyword) => value.includes(keyword))) {
    return Division.DRILLING;
  }
  return Division.PRODUCTION;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function boolFromText(value) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined) return false;
  const text = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1", "connected"].includes(text)) return true;
  return false;
}

function calibrationStatusFromDate(nextCalibration, explicitValue) {
  if (explicitValue) {
    const text = String(explicitValue).toLowerCase();
    if (text.includes("calibrated")) return CalibrationStatus.CALIBRATED;
    if (text.includes("overdue")) return CalibrationStatus.OVERDUE;
  }
  if (!nextCalibration) return CalibrationStatus.PENDING;
  return nextCalibration < new Date() ? CalibrationStatus.OVERDUE : CalibrationStatus.CALIBRATED;
}

function workingStatusFromText(value) {
  if (!value) return WorkingStatus.WORKING;
  const text = String(value).toLowerCase();
  if (text.includes("non") || text.includes("not")) {
    return WorkingStatus.NOT_WORKING;
  }
  return WorkingStatus.WORKING;
}

function safeInstrumentTag(value, fallbackPrefix, index) {
  const cleaned = normalizeName(value);
  if (cleaned) return cleaned;
  return `${fallbackPrefix}-${String(index + 1).padStart(4, "0")}`;
}

function extractScadaRecords(workbook) {
  const sheet = workbook.Sheets["SCADA(GAS) Flow meters"];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

  let currentArea = "AREA 01";
  let currentInstallation = "";
  const records = [];

  rows.forEach((row, index) => {
    const srNo = normalizeName(row["Sr.No."]);
    const site = normalizeName(row["Installation Site "]);
    const tag = normalizeName(row[" Tag No."]);

    if (srNo.toUpperCase().startsWith("AREA")) {
      currentArea = normalizeArea(srNo);
      if (site) {
        currentInstallation = site;
      }
      return;
    }

    if (site) {
      currentInstallation = site;
    }

    if (!currentInstallation || !tag) {
      return;
    }

    const lastCalibration =
      parseDate(row["Calibration dates"]) ||
      parseDate(row["Calibration dates.1"]) ||
      parseDate(row["Calibration dates.2"]) ||
      parseDate(row["Calibration dates 2026"]);
    const nextCalibration = lastCalibration
      ? new Date(lastCalibration.getTime() + 180 * 24 * 60 * 60 * 1000)
      : null;

    records.push({
      source: "SCADA",
      installationName: currentInstallation,
      area: currentArea,
      division: inferDivision(currentInstallation),
      tagNo: safeInstrumentTag(tag, "SCADA", index),
      equipmentType: "SCADA Flow Meter",
      serviceName: normalizeName(row["Service "]) || "SCADA Telemetry",
      make: null,
      model: null,
      serialNo: null,
      workingStatus: workingStatusFromText(row["Working status"]),
      calStatus: calibrationStatusFromDate(nextCalibration, null),
      lastCalibration,
      nextCalibration,
      scadaConnected:
        row["Scada Connectivity"] === null
          ? true
          : boolFromText(row["Scada Connectivity"]),
    });
  });

  return records;
}

function extractCtmRecords(workbook) {
  const sheet = workbook.Sheets.CTM;
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

  let currentArea = "AREA 01";
  const records = [];

  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const firstCell = normalizeName(row[0]);
    if (firstCell.toUpperCase().startsWith("AREA")) {
      currentArea = normalizeArea(firstCell);
      continue;
    }

    const installationName = normalizeName(row[2]);
    const consumerName = normalizeName(row[1]);

    if (!installationName || !consumerName) {
      continue;
    }

    const tagNo = `CTM-${consumerName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 30)}`;

    const calibratedText = normalizeName(row[5]);

    records.push({
      source: "CTM",
      installationName,
      area: currentArea,
      division: inferDivision(installationName),
      tagNo,
      equipmentType: "CTM",
      serviceName: "Custody Transfer",
      make: normalizeName(row[3]) || null,
      model: null,
      serialNo: null,
      workingStatus: workingStatusFromText(row[4]),
      calStatus: calibrationStatusFromDate(null, calibratedText),
      lastCalibration: null,
      nextCalibration: null,
      scadaConnected: boolFromText(row[6]),
    });
  }

  return records;
}

function uniqueBy(records, keyFn) {
  const seen = new Set();
  const output = [];
  records.forEach((item) => {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  });
  return output;
}

function getDefaultExcelPath() {
  const candidates = [
    process.env.SEED_XLSX_PATH,
    path.resolve(process.cwd(), "seed-data/all-instruments-isg-2025.xlsx"),
    path.resolve(process.cwd(), "../All instruments list isg 2025 (1).xlsx"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function clearTables(prisma) {
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.workOrderAssignment.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.workRequest.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.installationManagerAssignment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contractPersonnel.deleteMany();
  await prisma.ongcPersonnel.deleteMany();
  await prisma.installationManager.deleteMany();
  await prisma.installation.deleteMany();
  await prisma.serviceCatalog.deleteMany();
  await prisma.slaAvailability.deleteMany();
}

async function ensureServices(prisma) {
  const map = new Map();
  for (const serviceName of DEFAULT_SERVICES) {
    const service = await prisma.serviceCatalog.upsert({
      where: { name: serviceName },
      create: { name: serviceName, description: `${serviceName} scope` },
      update: { isActive: true },
    });
    map.set(service.name.toLowerCase(), service);
  }
  return map;
}

async function seedInstallationsAndInstruments(prisma, records, serviceMap) {
  const installations = uniqueBy(
    records.map((item) => ({
      name: item.installationName,
      area: item.area || "AREA 01",
      division: item.division || Division.PRODUCTION,
      location: item.installationName,
    })),
    (item) => item.name.toLowerCase()
  );

  const installationMap = new Map();
  for (const installation of installations) {
    const created = await prisma.installation.upsert({
      where: { name: installation.name },
      create: installation,
      update: {
        area: installation.area,
        division: installation.division,
        location: installation.location,
        isActive: true,
      },
    });
    installationMap.set(created.name.toLowerCase(), created);
  }

  const uniqueInstruments = uniqueBy(records, (item) => {
    return `${item.installationName.toLowerCase()}|${item.tagNo.toLowerCase()}`;
  });

  let sequence = 1;
  for (const item of uniqueInstruments) {
    const installation = installationMap.get(item.installationName.toLowerCase());
    if (!installation) continue;

    const instrumentCode = `INS-${String(sequence).padStart(5, "0")}`;
    sequence += 1;

    const service = serviceMap.get((item.serviceName || "").toLowerCase()) ||
      serviceMap.get("scada telemetry");

    await prisma.instrument.create({
      data: {
        instrumentCode,
        tagNo: item.tagNo,
        installationId: installation.id,
        serviceId: service?.id,
        equipmentType: item.equipmentType,
        make: item.make,
        model: item.model,
        serialNo: item.serialNo,
        workingStatus: item.workingStatus,
        calStatus: item.calStatus,
        lastCalibration: item.lastCalibration,
        nextCalibration: item.nextCalibration,
        scadaConnected: item.scadaConnected,
      },
    });
  }
}

async function seedPersonnelAndUsers(prisma) {
  const contractPersonnelMap = new Map();
  for (const [code, name, designation, specialization] of DEFAULT_CONTRACT_PERSONNEL) {
    const person = await prisma.contractPersonnel.upsert({
      where: { personnelCode: code },
      create: {
        personnelCode: code,
        name,
        designation,
        specialization,
        email: `${code.toLowerCase()}@cmsitservices.com`,
      },
      update: {
        name,
        designation,
        specialization,
        isActive: true,
      },
    });
    contractPersonnelMap.set(code, person);
  }

  const ongcPersonnelMap = new Map();
  for (const [code, name, designation, email] of DEFAULT_ONGC_PERSONNEL) {
    const person = await prisma.ongcPersonnel.upsert({
      where: { employeeCode: code },
      create: {
        employeeCode: code,
        name,
        designation,
        email,
      },
      update: {
        name,
        designation,
        email,
        isActive: true,
      },
    });
    ongcPersonnelMap.set(code, person);
  }

  const managerMap = new Map();
  for (const [code, name, email] of DEFAULT_MANAGERS) {
    const manager = await prisma.installationManager.upsert({
      where: { managerCode: code },
      create: {
        managerCode: code,
        name,
        email,
      },
      update: {
        name,
        email,
        isActive: true,
      },
    });
    managerMap.set(code, manager);
  }

  const users = [
    {
      username: "admin",
      password: "admin123",
      role: Role.ONGC_ADMIN,
      displayName: "ONGC Admin",
    },
    {
      username: "engineer",
      password: "engineer123",
      role: Role.ONGC_ENGINEER,
      displayName: "ONGC Engineer",
      ongcPersonnelId: ongcPersonnelMap.get("ONGC-001")?.id,
    },
    {
      username: "coordinator",
      password: "coord123",
      role: Role.CMS_COORDINATOR,
      displayName: "CMS Coordinator",
      contractPersonnelId: contractPersonnelMap.get("CMS-001")?.id,
    },
    {
      username: "tech",
      password: "tech123",
      role: Role.CMS_TECHNICIAN,
      displayName: "CMS Technician",
      contractPersonnelId: contractPersonnelMap.get("CMS-002")?.id,
    },
    {
      username: "viewer",
      password: "viewer123",
      role: Role.READ_ONLY,
      displayName: "Read Only",
    },
    {
      username: "manager01",
      password: "manager123",
      role: Role.INSTALLATION_MANAGER,
      displayName: "Area 01 Manager",
      managerId: managerMap.get("MGR-AREA-01")?.id,
    },
    {
      username: "manager02",
      password: "manager123",
      role: Role.INSTALLATION_MANAGER,
      displayName: "Area 02 Manager",
      managerId: managerMap.get("MGR-AREA-02")?.id,
    },
    {
      username: "manager03",
      password: "manager123",
      role: Role.INSTALLATION_MANAGER,
      displayName: "Area 03 Manager",
      managerId: managerMap.get("MGR-AREA-03")?.id,
    },
    {
      username: "manager04",
      password: "manager123",
      role: Role.INSTALLATION_MANAGER,
      displayName: "Area 04 Manager",
      managerId: managerMap.get("MGR-AREA-04")?.id,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        username: user.username,
        passwordHash: await bcrypt.hash(user.password, 10),
        role: user.role,
        displayName: user.displayName,
        managerId: user.managerId || null,
        contractPersonnelId: user.contractPersonnelId || null,
        ongcPersonnelId: user.ongcPersonnelId || null,
      },
      update: {
        role: user.role,
        displayName: user.displayName,
        managerId: user.managerId || null,
        contractPersonnelId: user.contractPersonnelId || null,
        ongcPersonnelId: user.ongcPersonnelId || null,
        isActive: true,
      },
    });
  }

  return { managerMap, contractPersonnelMap, ongcPersonnelMap };
}

async function seedManagerAssignments(prisma, managerMap) {
  const installations = await prisma.installation.findMany();

  const areaToManagerCode = new Map(
    DEFAULT_MANAGERS.map(([code, , , area]) => [area, code])
  );

  for (const installation of installations) {
    const managerCode = areaToManagerCode.get(normalizeArea(installation.area)) || "MGR-AREA-01";
    const manager = managerMap.get(managerCode);
    if (!manager) continue;

    await prisma.installationManagerAssignment.upsert({
      where: {
        installationId_managerId: {
          installationId: installation.id,
          managerId: manager.id,
        },
      },
      create: {
        installationId: installation.id,
        managerId: manager.id,
      },
      update: {},
    });
  }
}

async function seedWorkRequestsAndOrders(prisma, managerMap, ongcPersonnelMap) {
  const installations = await prisma.installation.findMany({ orderBy: { name: "asc" }, take: 4 });
  if (installations.length === 0) return;

  const manager = managerMap.get("MGR-AREA-01") || [...managerMap.values()][0];
  const engineer = ongcPersonnelMap.get("ONGC-001") || [...ongcPersonnelMap.values()][0];
  if (!manager || !engineer) return;
  const managerUser = await prisma.user.findFirst({ where: { managerId: manager.id } });

  const instruments = await prisma.instrument.findMany({
    where: { installationId: { in: installations.map((item) => item.id) } },
    take: 8,
    orderBy: { instrumentCode: "asc" },
  });

  for (let i = 0; i < Math.min(4, instruments.length); i += 1) {
    const instrument = instruments[i];
    const requestNo = `REQ-${String(i + 1).padStart(4, "0")}`;

    const request = await prisma.workRequest.upsert({
      where: { requestNo },
      create: {
        requestNo,
        installationId: instrument.installationId,
        instrumentId: instrument.id,
        serviceId: instrument.serviceId,
        requestedByManagerId: manager.id,
        createdByUserId: managerUser?.id || null,
        title: `Calibration request for ${instrument.tagNo}`,
        description: `Routine calibration request generated from seed data for ${instrument.tagNo}.`,
        priority: i % 2 === 0 ? Priority.HIGH : Priority.MEDIUM,
        status: WorkRequestStatus.SUBMITTED,
      },
      update: {},
    });

    if (i < 2) {
      const workOrderNo = `WO-${String(i + 1).padStart(4, "0")}`;
      const workOrder = await prisma.workOrder.upsert({
        where: { workOrderNo },
        create: {
          workOrderNo,
          workRequestId: request.id,
          installationId: instrument.installationId,
          instrumentId: instrument.id,
          serviceId: instrument.serviceId,
          category: i + 1,
          status: i === 0 ? WorkOrderStatus.SCHEDULED : WorkOrderStatus.IN_PROGRESS,
          scheduledDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          ongcEngineerId: engineer.id,
          escortRequired: i + 1 > 1,
          remarks: "Seed work order",
        },
        update: {},
      });

      await prisma.workRequest.update({
        where: { id: request.id },
        data: {
          status: WorkRequestStatus.CONVERTED,
          reviewedById: engineer.id,
          reviewedAt: new Date(),
          convertedWorkOrderId: workOrder.id,
          remarks: "Converted during seed",
        },
      });
    }
  }
}

export async function seedDatabase(prisma, options = {}) {
  const { reset = false, excelPath = getDefaultExcelPath(), logger = console } = options;

  if (!excelPath || !fs.existsSync(excelPath)) {
    throw new Error("Excel file not found for seeding. Set SEED_XLSX_PATH or place seed file under seed-data/.");
  }

  const existingInstallations = await prisma.installation.count();
  if (existingInstallations > 0 && !reset) {
    logger.log("Seed skipped: database already contains installations. Use --reset to reseed.");
    return;
  }

  if (reset) {
    logger.log("Resetting existing data before seed...");
    await clearTables(prisma);
  }

  logger.log(`Reading Excel seed data from: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath, { cellDates: true });

  const scadaRecords = extractScadaRecords(workbook);
  const ctmRecords = extractCtmRecords(workbook);
  const allRecords = [...scadaRecords, ...ctmRecords];

  logger.log(`Parsed records: SCADA=${scadaRecords.length}, CTM=${ctmRecords.length}, TOTAL=${allRecords.length}`);

  const serviceMap = await ensureServices(prisma);
  await seedInstallationsAndInstruments(prisma, allRecords, serviceMap);
  const { managerMap, contractPersonnelMap, ongcPersonnelMap } = await seedPersonnelAndUsers(prisma);
  await seedManagerAssignments(prisma, managerMap);
  await seedWorkRequestsAndOrders(prisma, managerMap, ongcPersonnelMap);

  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  await prisma.slaAvailability.upsert({
    where: { month: monthKey },
    create: { month: monthKey, availability: 99.7 },
    update: { availability: 99.7 },
  });

  await prisma.auditLog.create({
    data: {
      action: "SEED_COMPLETED",
      entity: "system",
      entityId: "seed",
      payload: {
        services: serviceMap.size,
        contractPersonnel: contractPersonnelMap.size,
        ongcPersonnel: ongcPersonnelMap.size,
      },
    },
  });

  logger.log("Seed completed successfully.");
}

async function runCli() {
  const prisma = new PrismaClient();
  try {
    const reset = process.argv.includes("--reset") || process.env.SEED_RESET === "true";
    const excelPath = getDefaultExcelPath();
    await seedDatabase(prisma, { reset, excelPath, logger: console });
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
