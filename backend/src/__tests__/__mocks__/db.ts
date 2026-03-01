// Mock pg Pool — all tests use this instead of a real DB
const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
});

const mockPool = {
    query: mockQuery,
    end: mockEnd,
    connect: mockConnect,
    on: jest.fn(),
};

export default mockPool;
export { mockQuery, mockEnd, mockConnect };
