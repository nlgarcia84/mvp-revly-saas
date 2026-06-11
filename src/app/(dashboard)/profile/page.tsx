const ProfilePage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Perfil</h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Tu información personal
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
