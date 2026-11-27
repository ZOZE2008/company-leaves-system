#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <iomanip>
using namespace std;

struct Employee {
    int id;
    string name;
    double baseSalary;
    int totalAnnualDays;
    int usedDays;
    int permissionHours;
};

int main() {
    // نفس قيم company_settings (id = 1)
    const int WARNING_LIMIT_DAYS = 15;
    const int BONUS_MIN_REMAINING_DAYS = 10;
    const double BONUS_AMOUNT = 1000.0;
    const int HOURS_PER_LEAVE_DAY = 8;

    ifstream inputFile("employees_export.csv");
    if (!inputFile.is_open()) {
        cout << "Error: cannot open employees_export.csv" << endl;
        return 1;
    }

    vector<Employee> employees;
    string line;
    getline(inputFile, line); // skip header

    while (getline(inputFile, line)) {
        if (line.empty()) continue;
        stringstream ss(line);
        string item;
        Employee emp;
        getline(ss, item, ','); emp.id = stoi(item);
        getline(ss, emp.name, ',');
        getline(ss, item, ','); emp.baseSalary = stod(item);
        getline(ss, item, ','); emp.totalAnnualDays = stoi(item);
        getline(ss, item, ','); emp.usedDays = stoi(item);
        getline(ss, item, ','); emp.permissionHours = stoi(item);
        employees.push_back(emp);
    }
    inputFile.close();

    ofstream reportFile("payroll_report.csv");
    reportFile << "ID,Name,Base_Salary,Effective_Used_Days,Remaining_Days,Bonus,Deduction,Net_Salary,Status\n";

    double totalPayroll = 0.0;
    int bonusWinners = 0, warningCount = 0;

    for (size_t i = 0; i < employees.size(); i++) {
        Employee emp = employees[i];
        int extraDays = emp.permissionHours / HOURS_PER_LEAVE_DAY;
        int effectiveUsed = emp.usedDays + extraDays;
        int remaining = emp.totalAnnualDays - effectiveUsed;
        double dailyRate = emp.baseSalary / 30.0;

        double bonus = 0.0, deduction = 0.0;
        string status;

        if (remaining < 0) {
            deduction = (-remaining) * dailyRate;
            status = "Deduction (exceeded balance)";
            warningCount++;
        } else if (effectiveUsed >= WARNING_LIMIT_DAYS) {
            status = "Warning (high usage)";
            warningCount++;
        } else if (remaining >= BONUS_MIN_REMAINING_DAYS) {
            bonus = BONUS_AMOUNT;
            status = "Bonus";
            bonusWinners++;
        } else {
            status = "Normal";
        }

        double netSalary = emp.baseSalary + bonus - deduction;
        totalPayroll += netSalary;

        reportFile << emp.id << "," << emp.name << "," << fixed << setprecision(2)
                   << emp.baseSalary << "," << effectiveUsed << "," << remaining << ","
                   << bonus << "," << deduction << "," << netSalary << "," << status << "\n";
    }
    reportFile.close();

    cout << "Processed " << employees.size() << " employees." << endl;
    cout << "Total payroll: " << totalPayroll << " | Bonus: " << bonusWinners
         << " | Warnings/Deductions: " << warningCount << endl;
    cout << "Report saved to payroll_report.csv" << endl;
    return 0;
}
