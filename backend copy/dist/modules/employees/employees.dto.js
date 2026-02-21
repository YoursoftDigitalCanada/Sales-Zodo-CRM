"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEmployeeResponseDto = toEmployeeResponseDto;
function toEmployeeResponseDto(emp) {
    return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        department: emp.department,
        position: emp.position,
        hireDate: emp.hireDate,
        salary: emp.salary ? Number(emp.salary) : null,
        isActive: emp.isActive,
        user: emp.user,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
    };
}
//# sourceMappingURL=employees.dto.js.map