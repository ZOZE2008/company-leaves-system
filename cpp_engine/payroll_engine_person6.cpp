#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <iomanip>
using namespace std;

struct Employee {
    string id;
    string name;
    double baseSalary;
    int totalAnnualDays;
    int usedDays;
    int permissionHours;
};

// Company settings: entered by the manager on the website and exported in the CSV
struct Settings {
    int bonusMinRemainingDays = 5;
    double bonusAmount = 1000.0;
    int warningLimitDays = 15;
    int hoursPerLeaveDay = 8;
};

int main() {
    Settings settings;

    ifstream inputFile("employees_export.csv");
    if (!inputFile.is_open()) {
        cout << "Error: cannot open employees_export.csv" << endl;
        return 1;
    }

    vector<Employee> employees;
    string line;
    getline(inputFile, line); // header

    while (getline(inputFile, line)) {
        // Skip empty lines and the ",,,,," spacer rows
        if (line.empty() || line == "\r" || line[0] == ',') continue;
        try {
            stringstream ss(line);
            string item;
            Employee emp;
            getline(ss, item, ','); emp.id = item;
            getline(ss, emp.name, ',');
            getline(ss, item, ','); emp.baseSalary = stod(item);
            getline(ss, item, ','); emp.totalAnnualDays = stoi(item);
            getline(ss, item, ','); emp.usedDays = stoi(item);
            getline(ss, item, ','); emp.permissionHours = stoi(item);

            // Columns 7-10: company settings (same value on every row)
            if (getline(ss, item, ',') && !item.empty()) settings.bonusMinRemainingDays = stoi(item);
            if (getline(ss, item, ',') && !item.empty()) settings.bonusAmount = stod(item);
            if (getline(ss, item, ',') && !item.empty()) settings.warningLimitDays = stoi(item);
            if (getline(ss, item, ',') && !item.empty()) settings.hoursPerLeaveDay = stoi(item);

            employees.push_back(emp);
        } catch (const exception&) {
            cout << "Skipped a row that could not be read: " << line << endl;
        }
    }
    inputFile.close();

    if (settings.hoursPerLeaveDay <= 0) settings.hoursPerLeaveDay = 8;

    cout << "Bonus threshold (from manager): more than " << settings.bonusMinRemainingDays
         << " remaining days" << endl;

    ofstream reportFile("payroll_report.csv");
    reportFile << "ID,Name,Base_Salary,Effective_Used_Days,Remaining_Days,Bonus,Deduction,Net_Salary,Status\n";

    double totalPayroll = 0.0;
    int bonusWinners = 0, warningCount = 0;

    for (size_t i = 0; i < employees.size(); i++) {
        Employee emp = employees[i];
        int extraDays = emp.permissionHours / settings.hoursPerLeaveDay;
        int effectiveUsed = emp.usedDays + extraDays;
        int remaining = emp.totalAnnualDays - effectiveUsed;
        double dailyRate = emp.baseSalary / 30.0;

        double bonus = 0.0, deduction = 0.0;
        string status;

        if (remaining < 0) {
            deduction = (-remaining) * dailyRate;
            status = "Deduction (exceeded balance)";
            warningCount++;
        } else if (remaining > settings.bonusMinRemainingDays) {
            bonus = settings.bonusAmount;
            status = "Bonus";
            bonusWinners++;
        } else if (effectiveUsed >= settings.warningLimitDays) {
            status = "Warning (high usage)";
            warningCount++;
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