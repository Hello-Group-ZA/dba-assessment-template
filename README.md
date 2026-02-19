# DBA Skills Assessment

Welcome to the Database Administrator Skills Assessment. This is a hands-on, timed evaluation of your MySQL administration capabilities across six progressive steps.

---

## Quick Start

1. **Accept the invitation** -- You received a GitHub invitation to this repository. Accept it to gain access.
2. **Navigate to the Actions tab** -- Go to the **Actions** tab in this repository.
3. **Run the provisioning workflow** -- Click on the **Provision Environment** workflow and select **Run workflow**. Enter your invite code when prompted.
4. **Wait for provisioning** -- Your AWS environment (3 EC2 instances) will be created in approximately 5 minutes. Connection details will appear on your assessment dashboard.
5. **Open your dashboard** -- Visit this repository's **GitHub Pages** site to view your progress, step instructions, and connection details.
6. **Begin the assessment** -- SSH into your primary instance and start with Step 1.

---

## How It Works

- This repository is your personal workspace for the assessment
- Your environment consists of **3 EC2 instances**: 1 primary (MySQL pre-installed) and 2 replicas (bare Ubuntu 22.04)
- Steps are unlocked sequentially -- complete one step to unlock the next
- Your progress is tracked automatically and displayed on the GitHub Pages dashboard
- Submit your work by pushing files to the `submissions/` folder and running the **Validate Step** workflow

---

## Assessment Overview

| Step | Title | Tier | Points |
|------|-------|------|--------|
| 1 | Connect and Document Schema | Fundamentals | 8 |
| 2 | Install MySQL and Set Up Replication | Fundamentals | 10 |
| 3 | Backups and Point-in-Time Recovery | Operational | 8 |
| 4 | Security and Performance Fixes | Operational | 8 |
| 5 | Query Optimization and Production Tuning | Advanced | 8 |
| 6 | Monitoring and Failover | Advanced | 8 |

**Total: 50 points across 6 steps**

**Time limit: 24 hours** from when you provision your environment.

### Scoring Tiers

- **Fundamentals (Steps 1-2):** Core DBA skills -- connecting, documenting, installing, and configuring replication
- **Operational (Steps 3-4):** Day-to-day DBA tasks -- backups, recovery, security hardening, and performance fixes
- **Advanced (Steps 5-6):** Production-grade skills -- query optimization, tuning, monitoring, and failover

---

## How to Submit Work

1. **Create your submission files** in the `submissions/` directory of this repository:
   - `submissions/schema-documentation.md` (Step 1)
   - `submissions/replication-setup.md` (Step 2)
   - `submissions/backup-strategy.md` (Step 3)
   - `submissions/security-changes.md` (Step 4)
   - `submissions/performance-fixes.md` (Step 4)
   - `submissions/tuning-report.md` (Step 5)
   - `submissions/monitoring-setup.md` (Step 6)
   - `submissions/failover-procedure.md` (Step 6)

2. **Commit and push** your files:
   ```bash
   git add submissions/
   git commit -m "Submit step N work"
   git push
   ```

3. **Run the validation workflow** -- Go to the **Actions** tab, select **Validate Step**, and run it for the step you want to validate.

4. **Check your dashboard** -- Your score and status will be updated on the GitHub Pages dashboard.

---

## Important Notes

- **Do not modify** files outside the `submissions/` directory (other than your MySQL instances)
- All work on the instances is also checked by automated validators
- Your environment will be **automatically terminated after 24 hours**
- The assessment evaluates both your technical work on the instances and your written documentation
- Partial credit is awarded -- attempt every step even if you cannot fully complete it

---

## FAQ

**Q: What if my environment fails to provision?**
A: Wait 2 minutes and try running the workflow again. If it still fails, contact your assessment administrator.

**Q: Can I use external resources (documentation, Stack Overflow)?**
A: Yes. This is an open-book assessment. You may reference any documentation. However, all work must be your own.

**Q: What MySQL version should I use?**
A: MySQL 8.0. The primary instance comes with MySQL 8.0 pre-installed. Install the same version on replicas.

**Q: Do I need to complete all steps?**
A: No. Steps are progressively harder. Complete as many as you can within the time limit. Partial credit is awarded.

**Q: What happens when time expires?**
A: Your instances are terminated, but your repository submissions remain. Any work pushed to the repo before the deadline counts.

**Q: Can I restart my environment?**
A: No. Each candidate gets one environment. Treat it like a production system.

---

## Support

If you encounter technical issues with the assessment platform (not the assessment tasks themselves), contact the person who sent you the invite code.

> Note: Support is limited to platform issues (provisioning failures, access problems, etc.). The administrator will not provide hints or answers to assessment questions.
