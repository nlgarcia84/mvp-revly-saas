const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold mb-6">Política de Privacidad</h1>

        <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed space-y-4">
          <p>
            En cumplimiento del Reglamento General de Protección de Datos (RGPD) y la Ley
            Orgánica de Protección de Datos y Garantía de los Derechos Digitales (LOPDGDD),
            informamos al usuario sobre el tratamiento de sus datos personales.
          </p>

          <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mt-6">Responsable del tratamiento</h2>
          <p>
            Revly, con domicilio en España, es el responsable del tratamiento de los datos
            facilitados por los usuarios a través de este formulario.
          </p>

          <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mt-6">Finalidad del tratamiento</h2>
          <p>
            Los datos recogidos se utilizarán exclusivamente para:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestionar la solicitud de descuento del 10% en el negocio seleccionado.</li>
            <li>Enviar comunicaciones comerciales personalizadas del negocio.</li>
            <li>Mejorar la experiencia del cliente y realizar análisis estadísticos internos.</li>
          </ul>

          <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mt-6">Legitimación</h2>
          <p>
            El tratamiento se basa en el consentimiento explícito del usuario, manifestado
            mediante la marcación de la casilla correspondiente en el formulario de recogida
            de datos.
          </p>

          <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mt-6">Destinatarios</h2>
          <p>
            Los datos serán comunicados al negocio correspondiente para la gestión del
            descuento y las comunicaciones comerciales. No se cederán datos a terceros
            salvo obligación legal.
          </p>

          <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mt-6">Derechos del usuario</h2>
          <p>
            El usuario puede ejercer sus derechos de acceso, rectificación, supresión,
            limitación, portabilidad y oposición dirigiéndose a nuestro correo electrónico.
            Asimismo, tiene derecho a retirar el consentimiento prestado en cualquier momento.
          </p>

          <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mt-6">Plazo de conservación</h2>
          <p>
            Los datos se conservarán durante el tiempo necesario para cumplir con la finalidad
            para la que fueron recogidos y durante los plazos legales establecidos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
