ALTER TABLE Asientos_Por_Partido
  MODIFY estado ENUM('disponible', 'apartado', 'vendido', 'bloqueado') NOT NULL DEFAULT 'disponible';