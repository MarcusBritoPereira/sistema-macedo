# Plan: Refactor UP_Fin to sistema-macedo & Install AG-Kit Skills

This plan covers the rebranding of the project from "UP_Fin" (and related terms) to "sistema-macedo" across all layers (Backend, Frontend, Infrastructure, and Documentation). It also includes the update of the Antigravity Kit (AG-Kit) skills.

## Phase 1: Infrastructure & Skills Setup
- [x] **Task 1.1: Install/Update AG-Kit Skills**
    - [x] Run `npx @vudovn/ag-kit init` to ensure the latest skills and agents are present.
    - [x] Verify `.agent` directory integrity.
- [x] **Task 1.2: Backup Critical Files**
    - [x] Create a backup of `.env` files and critical configuration scripts.

## Phase 2: Global Discovery
- [x] **Task 2.1: Comprehensive Search**
    - [x] Map all occurrences of `UP_Fin`, `UPFin`, `up-finance`, `Up Finance`, `up_fin`, `Projeto_ERP_Up`.
    - [x] Categorize findings: Code, UI, Infrastructure, Files/Folders.

## Phase 3: Content Refactoring (Backend & Frontend)
- [x] **Task 3.1: Frontend Content Update**
    - [x] Update `package.json` (name, author, description).
    - [x] Update UI components, titles, and labels.
    - [x] Update environment files (`src/environments/*`).
- [x] **Task 3.2: Backend Content Update**
    - [x] Update `package.json` (if applicable).
    - [x] Update Prisma schema and check scripts (`backend/src/check_paths.ts`).
    - [x] Update any internal references in services/controllers.

## Phase 4: Structural & Infrastructure Refactoring
- [x] **Task 4.1: Rename Files and Folders**
    - [x] Rename directories containing `up-finance` or `UP_Fin`.
    - [x] Update file paths in configuration files.
- [x] **Task 4.2: Update DevOps & Scripts**
    - [x] Update `docker-compose.yml` and `docker-compose.prod.yml`.
    - [x] Update `deploy_db.sh` and other shell scripts.
    - [x] Update database name references if applicable.

## Phase 5: Verification & Cleanup
- [x] **Task 5.1: Run Validation Scripts**
    - [x] Run `python .agent/scripts/checklist.py .` to ensure no critical breaks.
- [x] **Task 5.2: Final Manual Verification**
    - [x] Verify if the application starts correctly (Backend & Frontend).
    - [x] Check banking integration paths (Prisma check).
